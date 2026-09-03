<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Enums\LeadStatus;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Illuminate\Validation\ValidationException;

class ConvertLeadService
{
    public function __construct(
        private CreateCompanyService $createCompanyService,
        private CreateContactService $createContactService,
        private CreateOpportunityService $createOpportunityService
    ) {}

    public function execute(Lead $lead, array $data, ?int $userId = null): array
    {
        return DB::transaction(function () use ($lead, $data, $userId) {
            $lead = Lead::where('id', $lead->id)->lockForUpdate()->first();

            if (!$lead || $lead->trashed()) {
                throw ValidationException::withMessages(['lead' => __('Cannot convert a soft-deleted lead.')]);
            }

            if ($lead->status === LeadStatus::CONVERTED || $lead->converted_at !== null) {
                throw new ConflictHttpException(__('Lead has already been converted.'));
            }

            $companyId = null;
            $company = null;

            if ($data['company']['mode'] === 'create') {
                $companyData = $data['company']['data'];
                $companyData['relationship_types'] = ['prospect'];
                
                $duplicateQuery = Company::where('name', $companyData['name']);
                if (!empty($companyData['email'])) {
                    $duplicateQuery->orWhere('email', $companyData['email']);
                }
                
                $duplicates = $duplicateQuery->get();
                if ($duplicates->isNotEmpty()) {
                    throw new ConflictHttpException(json_encode([
                        'message' => __('Duplicate company detected.'),
                        'matches' => $duplicates->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'reference' => $c->reference])->toArray()
                    ]));
                }
                
                $company = $this->createCompanyService->execute($companyData);
                $companyId = $company->id;
            } else {
                $companyId = $data['company']['id'];
                $company = Company::find($companyId);
            }

            $contactId = null;
            $contact = null;

            if ($data['contact']['mode'] === 'create') {
                $contactData = $data['contact']['data'];
                $contactData['company_id'] = $companyId;
                
                $duplicateQuery = Contact::where('company_id', $companyId)
                    ->where(function($q) use ($contactData) {
                        $q->where(function($q2) use ($contactData) {
                            $q2->where('first_name', $contactData['first_name']);
                            if (!empty($contactData['last_name'])) {
                                $q2->where('last_name', $contactData['last_name']);
                            }
                        });
                        if (!empty($contactData['email'])) {
                            $q->orWhere('email', $contactData['email']);
                        }
                    });
                
                $duplicates = $duplicateQuery->get();
                if ($duplicates->isNotEmpty()) {
                    throw new ConflictHttpException(json_encode([
                        'message' => __('Duplicate contact detected.'),
                        'matches' => $duplicates->map(fn($c) => ['id' => $c->id, 'name' => trim($c->first_name . ' ' . $c->last_name), 'reference' => $c->reference])->toArray()
                    ]));
                }
                
                $contact = $this->createContactService->execute($contactData);
                $contactId = $contact->id;
            } elseif ($data['contact']['mode'] === 'existing') {
                $contactId = $data['contact']['id'];
                $contact = Contact::find($contactId);
            }

            $oppData = $data['opportunity'];
            $oppData['company_id'] = $companyId;
            $oppData['primary_contact_id'] = $contactId;
            $oppData['lead_id'] = $lead->id;
            
            if (empty($oppData['owner_id']) && $lead->assigned_to) {
                $oppData['owner_id'] = $lead->assigned_to;
            }
            if (empty($oppData['service_interest']) && $lead->service_interest) {
                $oppData['service_interest'] = $lead->service_interest;
            }
            if (!isset($oppData['estimated_value']) && $lead->estimated_value) {
                $oppData['estimated_value'] = $lead->estimated_value;
            }
            if (empty($oppData['currency']) && $lead->currency) {
                $oppData['currency'] = $lead->currency;
            }

            $opportunity = $this->createOpportunityService->execute($oppData, $userId);

            $oldLeadData = $lead->toArray();
            $lead->status = LeadStatus::CONVERTED;
            $lead->converted_at = now();
            if (!$lead->company_id) {
                $lead->company_id = $companyId;
            }
            if (!$lead->contact_id) {
                $lead->contact_id = $contactId;
            }
            $lead->save();

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'lead.converted',
                'subject_type' => Lead::class,
                'subject_id' => $lead->id,
                'old_values' => $oldLeadData,
                'new_values' => $lead->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent()
                ]
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'lead.converted',
                'subject_type' => Lead::class,
                'subject_id' => $lead->id,
                'company_id' => $companyId,
                'metadata' => [
                    'lead_reference' => $lead->reference,
                    'company_reference' => $company->reference ?? null,
                    'contact_reference' => $contact->reference ?? null,
                    'opportunity_reference' => $opportunity->reference,
                ],
            ]);

            return [
                'lead' => $lead,
                'company' => $company,
                'contact' => $contact,
                'opportunity' => $opportunity
            ];
        });
    }
}

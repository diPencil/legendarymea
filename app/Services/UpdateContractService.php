<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\Contract;
use App\Models\CrmActivity;
use App\Models\Quotation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateContractService
{
    public function execute(Contract $contract, array $data, int $updatedBy, ContractLifecycleService $lifecycleService): Contract
    {
        $requestedStatus = array_key_exists('status', $data)
            ? ContractStatus::from($data['status'])
            : $contract->status;

        if ($contract->status === ContractStatus::ACTIVE && $requestedStatus !== ContractStatus::DRAFT) {
            throw ValidationException::withMessages([
                'status' => ['Only draft contracts can be edited.'],
            ]);
        }

        $companyId = array_key_exists('company_id', $data) ? $data['company_id'] : $contract->company_id;
        $this->validateRelationshipIntegrity($data, $companyId, $contract);

        return DB::transaction(function () use ($contract, $data, $updatedBy, $lifecycleService, $requestedStatus) {
            if ($contract->status === ContractStatus::ACTIVE && $requestedStatus === ContractStatus::DRAFT) {
                $contract = $lifecycleService->revertToDraft($contract, $updatedBy);
            }

            $oldValues = $this->auditValues($contract);

            if (array_key_exists('title', $data)) $contract->title = $data['title'];
            if (array_key_exists('company_id', $data)) $contract->company_id = $data['company_id'];
            if (array_key_exists('contact_id', $data)) $contract->contact_id = $data['contact_id'];
            if (array_key_exists('quotation_id', $data)) $contract->quotation_id = $data['quotation_id'];
            
            if (array_key_exists('start_date', $data)) $contract->start_date = $data['start_date'];
            if (array_key_exists('end_date', $data)) $contract->end_date = $data['end_date'];
            if (array_key_exists('signed_at', $data)) $contract->signed_at = $data['signed_at'];
            
            if (array_key_exists('contract_value', $data)) $contract->contract_value = $data['contract_value'];
            if (array_key_exists('currency', $data)) {
                $contract->currency = isset($data['currency']) ? strtoupper($data['currency']) : null;
            }
            
            if (array_key_exists('terms', $data)) $contract->terms = $data['terms'];
            if (array_key_exists('notes', $data)) $contract->notes = $data['notes'];
            if (array_key_exists('contract_content', $data)) $contract->contract_content = LegendaryContractTemplate::normalize($data['contract_content'] ?? null);
            if (array_key_exists('additional_terms_en', $data)) $contract->additional_terms_en = $data['additional_terms_en'];
            if (array_key_exists('additional_terms_ar', $data)) $contract->additional_terms_ar = $data['additional_terms_ar'];
            if (array_key_exists('scope_of_work_en', $data)) $contract->scope_of_work_en = $data['scope_of_work_en'];
            if (array_key_exists('scope_of_work_ar', $data)) $contract->scope_of_work_ar = $data['scope_of_work_ar'];
            if (array_key_exists('payment_terms_en', $data)) $contract->payment_terms_en = $data['payment_terms_en'];
            if (array_key_exists('payment_terms_ar', $data)) $contract->payment_terms_ar = $data['payment_terms_ar'];

                        if ($contract->status === ContractStatus::DRAFT && $requestedStatus === ContractStatus::ACTIVE) {
                            if ($contract->isDirty()) {
                                $contract->save();

                                AuditLog::create([
                                    'user_id'         => $updatedBy,
                                    'action'          => 'contract.updated',
                                    'subject_type'    => Contract::class,
                                    'subject_id'      => $contract->id,
                                    'old_values'      => $oldValues,
                                    'new_values'      => $this->auditValues($contract),
                                    'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
                                ]);
                            }

                            return $lifecycleService->activate($contract, $updatedBy);
                        }

            if ($contract->isDirty()) {
                $contract->save();

                AuditLog::create([
                    'user_id'         => $updatedBy,
                    'action'          => 'contract.updated',
                    'subject_type'    => Contract::class,
                    'subject_id'      => $contract->id,
                    'old_values'      => $oldValues,
                    'new_values'      => $this->auditValues($contract),
                    'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
                ]);

                // We only create an activity if company changed or something major.
                // For now, let's just log a generic update if we want, or nothing to avoid noise.
                // The prompt says "Avoid noisy duplicate events." Let's skip CRM Activity for minor updates,
                // or just log it if title/value changes. We'll stick to Audit for updates.
            }

            return $contract;
        });
    }

    private function validateRelationshipIntegrity(array &$data, int $companyId, Contract $contract): void
    {
        // Check new contact
        $contactId = array_key_exists('contact_id', $data) ? $data['contact_id'] : $contract->contact_id;
        if ($contactId) {
            $contact = Contact::find($contactId);
            if ($contact && (int) $contact->company_id !== (int) $companyId) {
                if (array_key_exists('company_id', $data) && !array_key_exists('contact_id', $data)) {
                    // Company changed, existing contact incompatible -> clear it safely
                    $data['contact_id'] = null;
                } else {
                    throw ValidationException::withMessages([
                        'contact_id' => ['The selected contact does not belong to the selected company.'],
                    ]);
                }
            }
        }

        // Check new quotation
        $quotationId = array_key_exists('quotation_id', $data) ? $data['quotation_id'] : $contract->quotation_id;
        if ($quotationId) {
            $quotation = Quotation::find($quotationId);
            if ($quotation) {
                if ((int) $quotation->company_id !== (int) $companyId) {
                    if (array_key_exists('company_id', $data) && !array_key_exists('quotation_id', $data)) {
                        // Company changed, existing quotation incompatible -> clear it safely
                        $data['quotation_id'] = null;
                        return;
                    } else {
                        throw ValidationException::withMessages([
                            'quotation_id' => ['The selected quotation does not belong to the selected company.'],
                        ]);
                    }
                }
                
                if ($quotation->status !== \App\Enums\QuotationStatus::ACCEPTED) {
                    throw ValidationException::withMessages([
                        'quotation_id' => ['The linked quotation must be accepted.'],
                    ]);
                }
            }
        }
    }

    private function auditValues(Contract $contract): array
    {
        return array_intersect_key($contract->toArray(), array_flip([
            'id', 'reference', 'title', 'company_id', 'contact_id', 'quotation_id',
            'status', 'start_date', 'end_date', 'signed_at', 'contract_value',
            'currency', 'contract_content', 'created_by'
        ]));
    }
}

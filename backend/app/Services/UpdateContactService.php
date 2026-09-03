<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\CrmActivity;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class UpdateContactService
{
    public function __construct(
        private SetPrimaryCompanyContactService $setPrimaryService
    ) {}

    public function execute(Contact $contact, array $data): Contact
    {
        return DB::transaction(function () use ($contact, $data) {
            $oldCompanyId = $contact->company_id;
            
            if (isset($data['email'])) {
                $data['email'] = strtolower(trim($data['email']));
            }

            $newCompanyId = array_key_exists('company_id', $data) ? $data['company_id'] : $contact->company_id;
            $companyChanged = $oldCompanyId !== $newCompanyId;

            // If company changed and it was primary, it loses primary status automatically
            if ($companyChanged && $contact->is_primary) {
                $contact->is_primary = false;
                $contact->save();
            }

            // Update contact fields
            $contact->update($data);

            // Handle primary logic if explicitly requested to be primary in the new state
            if (isset($data['is_primary']) && $data['is_primary'] && $contact->company_id) {
                // Ensure we don't have is_primary = true prematurely if we delegate
                $contact->is_primary = false;
                $contact->save();
                
                $contact = $this->setPrimaryService->execute($contact->company, $contact);
            }

            // Log Audit
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'contact.updated',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'payload' => [
                    'contact_id' => $contact->id,
                    'reference' => $contact->reference,
                    'company_id' => $contact->company_id,
                ]
            ]);

            // Log CRM Activity
            CrmActivity::create([
                'company_id' => $contact->company_id,
                'actor_id' => Auth::id(),
                'subject_type' => Contact::class,
                'subject_id' => $contact->id,
                'type' => 'contact.updated',
                'metadata' => [
                    'contact_reference' => $contact->reference,
                    'company_changed' => $companyChanged,
                ],
            ]);

            if ($companyChanged) {
                // Additional explicit CRM activity for company changed
                CrmActivity::create([
                    'company_id' => $contact->company_id,
                    'actor_id' => Auth::id(),
                    'subject_type' => Contact::class,
                    'subject_id' => $contact->id,
                    'type' => 'contact.company_changed',
                    'metadata' => [
                        'contact_reference' => $contact->reference,
                        'old_company_id' => $oldCompanyId,
                        'new_company_id' => $newCompanyId,
                    ],
                ]);
                
                AuditLog::create([
                    'user_id' => Auth::id(),
                    'action' => 'contact.company_changed',
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'payload' => [
                        'contact_id' => $contact->id,
                        'old_company_id' => $oldCompanyId,
                        'new_company_id' => $newCompanyId,
                    ]
                ]);
            }

            return $contact->fresh();
        });
    }
}

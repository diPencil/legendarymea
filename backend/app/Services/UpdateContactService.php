<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Contact;
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
            $oldValues = $contact->only([
                'id',
                'reference',
                'company_id',
                'first_name',
                'last_name',
                'email',
                'phone',
                'job_title',
                'is_primary',
            ]);

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
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Contact',
            entity: $contact,
            oldValues: $oldValues,
            newValues: $contact->only([
                            'id',
                            'reference',
                            'company_id',
                            'first_name',
                            'last_name',
                            'email',
                            'phone',
                            'job_title',
                            'is_primary',
                        ]),
            metadata: [
                            'contact_reference' => $contact->reference,
                            'company_changed' => $companyChanged,
                            'company_id' => $contact->company_id,
                        ]
        );

            if ($companyChanged) {
                // Additional explicit CRM activity for company changed
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'company_changed',
            module: 'Contact',
            entity: $contact,
            oldValues: [],
            newValues: [],
            metadata: [
                                'contact_reference' => $contact->reference,
                                'old_company_id' => $oldCompanyId,
                                'new_company_id' => $newCompanyId,
                            ]
        );
                
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'company_changed',
            module: 'Contact',
            entity: null,
            oldValues: [],
            newValues: [],
            metadata: []
        );
            }

            return $contact->fresh();
        });
    }
}

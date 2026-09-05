<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Contact;
use App\Models\Company;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SetPrimaryCompanyContactService
{
    public function execute(Company $company, Contact $newPrimaryContact, ?string $notes = null): Contact
    {
        return DB::transaction(function () use ($company, $newPrimaryContact, $notes) {
            if ($newPrimaryContact->company_id !== $company->id) {
                throw new \Exception(__('Contact does not belong to the specified Company.'));
            }

            if ($newPrimaryContact->trashed()) {
                throw new \Exception(__('Cannot set a deleted contact as primary.'));
            }

            $oldPrimary = $company->primaryContact;

            if ($oldPrimary && $oldPrimary->id === $newPrimaryContact->id) {
                // Already primary, nothing to do
                return $newPrimaryContact;
            }

            // Unset old primary
            if ($oldPrimary) {
                $oldPrimary->is_primary = false;
                $oldPrimary->save();

                // Log audit for old primary
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'primary_changed',
            module: 'Contact',
            entity: $newPrimaryContact,
            oldValues: [],
            newValues: [],
            metadata: [
                            'contact_reference' => $newPrimaryContact->reference,
                            'contact_name' => trim($newPrimaryContact->first_name . ' ' . $newPrimaryContact->last_name),
                            'notes' => $notes
                        ]
        );
            }

            // Log audit for new primary
            $newPrimaryContact->is_primary = true;
            $newPrimaryContact->save();

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'primary_changed',
                module: 'Contact',
                entity: $newPrimaryContact,
                oldValues: ['old_primary_contact_id' => $oldPrimary?->id],
                newValues: ['new_primary_contact_id' => $newPrimaryContact->id],
                metadata: [
                    'company_reference' => $company->reference,
                    'contact_reference' => $newPrimaryContact->reference,
                    'notes' => $notes,
                ]
        );

            return $newPrimaryContact;
        });
    }
}

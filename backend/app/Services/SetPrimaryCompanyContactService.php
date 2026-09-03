<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\Company;
use App\Models\CrmActivity;
use App\Models\AuditLog;
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
                AuditLog::create([
                    'user_id' => Auth::id(),
                    'action' => 'contact.primary_changed',
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'payload' => [
                        'contact_id' => $oldPrimary->id,
                        'contact_reference' => $oldPrimary->reference,
                        'company_id' => $company->id,
                        'is_primary' => false,
                    ]
                ]);
            }

            // Set new primary
            $newPrimaryContact->is_primary = true;
            $newPrimaryContact->save();

            // Log activity for new primary
            CrmActivity::create([
                'company_id' => $company->id,
                'actor_id' => Auth::id(),
                'subject_type' => Contact::class,
                'subject_id' => $newPrimaryContact->id,
                'type' => 'contact.primary_changed',
                'metadata' => [
                    'contact_reference' => $newPrimaryContact->reference,
                    'contact_name' => trim($newPrimaryContact->first_name . ' ' . $newPrimaryContact->last_name),
                    'notes' => $notes
                ],
            ]);

            // Log audit for new primary
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'contact.primary_changed',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'payload' => [
                    'contact_id' => $newPrimaryContact->id,
                    'contact_reference' => $newPrimaryContact->reference,
                    'company_id' => $company->id,
                    'is_primary' => true,
                ]
            ]);

            return $newPrimaryContact;
        });
    }
}

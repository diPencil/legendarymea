<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\CrmActivity;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class CreateContactService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
        private SetPrimaryCompanyContactService $setPrimaryService
    ) {}

    public function execute(array $data): Contact
    {
        return DB::transaction(function () use ($data) {
            $data['reference'] = $this->referenceGenerator->generate('LM-CNT-' . date('Y'), 'contacts', 'reference', 6);
            $data['created_by'] = Auth::id();
            $data['is_primary'] = $data['is_primary'] ?? false;
            
            if (isset($data['email'])) {
                $data['email'] = strtolower(trim($data['email']));
            }

            // Create Contact
            $contact = Contact::create($data);

            // Log Audit
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'contact.created',
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
                'company_id' => $contact->company_id, // can be null
                'actor_id' => Auth::id(),
                'subject_type' => Contact::class,
                'subject_id' => $contact->id,
                'type' => 'contact.created',
                'metadata' => [
                    'contact_reference' => $contact->reference,
                    'contact_name' => trim($contact->first_name . ' ' . $contact->last_name),
                ],
            ]);

            // Handle primary logic if requested and company exists
            if ($contact->is_primary && $contact->company_id) {
                // Ensure we don't have is_primary = true prematurely if we delegate
                $contact->is_primary = false;
                $contact->save();
                
                $contact = $this->setPrimaryService->execute($contact->company, $contact);
            }

            return $contact->fresh();
        });
    }
}

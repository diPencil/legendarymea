<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Contact;
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
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Contact',
            entity: $contact,
            oldValues: [],
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
                            'created_by',
                        ]),
            metadata: [
                            'contact_reference' => $contact->reference,
                            'contact_name' => trim($contact->first_name . ' ' . $contact->last_name),
                            'company_id' => $contact->company_id,
                        ]
        );

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

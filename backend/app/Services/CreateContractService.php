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

class CreateContractService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, int $createdBy): Contract
    {
        $this->validateRelationshipIntegrity($data);

        return DB::transaction(function () use ($data, $createdBy) {
            $reference = $this->referenceGenerator->generate(
                'LM-CTR-' . date('Y') . '-',
                'contracts',
                'reference',
                6
            );

            $contract = Contract::create([
                'reference'      => $reference,
                'title'          => $data['title'],
                'company_id'     => $data['company_id'],
                'contact_id'     => $data['contact_id'] ?? null,
                'quotation_id'   => $data['quotation_id'] ?? null,
                'status'         => ContractStatus::DRAFT,
                'start_date'     => $data['start_date'] ?? null,
                'end_date'       => $data['end_date'] ?? null,
                'signed_at'      => $data['signed_at'] ?? null,
                'contract_value' => $data['contract_value'] ?? null,
                'currency'       => isset($data['currency']) ? strtoupper($data['currency']) : null,
                'terms'          => $data['terms'] ?? null,
                'notes'          => $data['notes'] ?? null,
                'contract_content' => LegendaryContractTemplate::normalize($data['contract_content'] ?? null),
                'additional_terms_en' => $data['additional_terms_en'] ?? null,
                'additional_terms_ar' => $data['additional_terms_ar'] ?? null,
                'scope_of_work_en' => $data['scope_of_work_en'] ?? null,
                'scope_of_work_ar' => $data['scope_of_work_ar'] ?? null,
                'payment_terms_en' => $data['payment_terms_en'] ?? null,
                'payment_terms_ar' => $data['payment_terms_ar'] ?? null,
                'created_by'     => $createdBy,
            ]);

            AuditLog::create([
                'user_id'         => $createdBy,
                'action'          => 'contract.created',
                'subject_type'    => Contract::class,
                'subject_id'      => $contract->id,
                'old_values'      => null,
                'new_values'      => $this->auditValues($contract),
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id'     => $createdBy,
                'type'         => 'contract.created',
                'subject_type' => Contract::class,
                'subject_id'   => $contract->id,
                'company_id'   => $contract->company_id,
                'metadata'     => [
                    'contract_id'        => $contract->id,
                    'contract_reference' => $contract->reference,
                    'status'             => $contract->status->value,
                    'title'              => $contract->title,
                ],
            ]);

            return $contract;
        });
    }

    private function validateRelationshipIntegrity(array $data): void
    {
        $companyId = $data['company_id'] ?? null;
        if (!$companyId) {
            return;
        }

        if (!empty($data['contact_id'])) {
            $contact = Contact::find($data['contact_id']);
            if ($contact && (int) $contact->company_id !== (int) $companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['quotation_id'])) {
            $quotation = Quotation::find($data['quotation_id']);
            if ($quotation) {
                if ((int) $quotation->company_id !== (int) $companyId) {
                    throw ValidationException::withMessages([
                        'quotation_id' => ['The selected quotation does not belong to the selected company.'],
                    ]);
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

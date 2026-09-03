<?php

namespace App\Services;

use App\Enums\QuotationStatus;
use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\CrmActivity;
use App\Models\Opportunity;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateQuotationService
{
    public function __construct(
        private ReferenceGeneratorService   $referenceGenerator,
        private QuotationCalculationService $calculator
    ) {}

    public function execute(array $data, int $createdBy): Quotation
    {
        $this->validateRelationshipIntegrity($data);

        return DB::transaction(function () use ($data, $createdBy) {
            $reference = $this->referenceGenerator->generate(
                'LM-QTN-' . date('Y') . '-',
                'quotations',
                'reference',
                6
            );

            // Server calculates all items and totals
            $itemsData = $data['items'];
            $calculatedItems = [];
            foreach ($itemsData as $index => $item) {
                $lineTotal = $this->calculator->itemLineTotal($item['quantity'], $item['unit_price']);
                $calculatedItems[] = [
                    'description' => $item['description'],
                    'quantity'    => (string) $item['quantity'],
                    'unit_price'  => (string) $item['unit_price'],
                    'line_total'  => $lineTotal,
                    'sort_order'  => $item['sort_order'] ?? $index,
                ];
            }

            $subtotal        = $this->calculator->subtotalFromLines(array_map(fn($i) => [
                'quantity'   => $i['quantity'],
                'unit_price' => $i['unit_price'],
            ], $calculatedItems));
            $discountAmount  = (string) ($data['discount_amount'] ?? 0);
            $taxAmount       = (string) ($data['tax_amount'] ?? 0);
            $totalAmount     = $this->calculator->total($subtotal, $discountAmount, $taxAmount);

            $quotation = Quotation::create([
                'reference'       => $reference,
                'company_id'      => $data['company_id'],
                'contact_id'      => $data['contact_id'] ?? null,
                'opportunity_id'  => $data['opportunity_id'] ?? null,
                'request_id'      => $data['request_id'] ?? null,
                'status'          => QuotationStatus::DRAFT,
                'currency'        => strtoupper($data['currency']),
                'issue_date'      => $data['issue_date'] ?? null,
                'valid_until'     => $data['valid_until'] ?? null,
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount'      => $taxAmount,
                'total_amount'    => $totalAmount,
                'notes'           => $data['notes'] ?? null,
                'terms'           => $data['terms'] ?? null,
                'created_by'      => $createdBy,
            ]);

            foreach ($calculatedItems as $item) {
                QuotationItem::create(array_merge($item, ['quotation_id' => $quotation->id]));
            }

            AuditLog::create([
                'user_id'         => $createdBy,
                'action'          => 'quotation.created',
                'subject_type'    => Quotation::class,
                'subject_id'      => $quotation->id,
                'old_values'      => null,
                'new_values'      => $this->auditValues($quotation),
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id'     => $createdBy,
                'type'         => 'quotation.created',
                'subject_type' => Quotation::class,
                'subject_id'   => $quotation->id,
                'company_id'   => $quotation->company_id,
                'metadata'     => [
                    'quotation_id'        => $quotation->id,
                    'quotation_reference' => $quotation->reference,
                    'status'              => $quotation->status->value,
                    'total_amount'        => $totalAmount,
                    'currency'            => $quotation->currency,
                ],
            ]);

            return $quotation;
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

        if (!empty($data['opportunity_id'])) {
            $opportunity = Opportunity::find($data['opportunity_id']);
            if ($opportunity && (int) $opportunity->company_id !== (int) $companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['request_id'])) {
            $request = Request::find($data['request_id']);
            if ($request && (int) $request->company_id !== (int) $companyId) {
                throw ValidationException::withMessages([
                    'request_id' => ['The selected request does not belong to the selected company.'],
                ]);
            }
        }
    }

    private function auditValues(Quotation $quotation): array
    {
        return array_intersect_key($quotation->toArray(), array_flip([
            'id', 'reference', 'company_id', 'contact_id', 'opportunity_id',
            'request_id', 'status', 'currency', 'subtotal', 'discount_amount',
            'tax_amount', 'total_amount', 'issue_date', 'valid_until', 'created_by',
        ]));
    }
}

<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\QuotationStatus;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateQuotationService
{
    public function __construct(
        private QuotationCalculationService $calculator
    ) {}

    public function execute(Quotation $quotation, array $data, int $updatedBy): Quotation
    {
        // Draft-only protection for commercial content
        if ($quotation->status !== QuotationStatus::DRAFT) {
            throw ValidationException::withMessages([
                'status' => ['Only draft quotations can be edited.'],
            ]);
        }

        $hasPendingApproval = $quotation->approvals()->where('status', 'pending')->exists();
        if ($hasPendingApproval) {
            throw ValidationException::withMessages([
                'status' => ['Cannot modify quotation while it has a pending approval request.'],
            ]);
        }

        // Strip fields that must never come from client
        foreach (['reference', 'created_by', 'subtotal', 'total_amount', 'status'] as $immutable) {
            unset($data[$immutable]);
        }

        $oldCompanyId = $quotation->company_id;
        $newCompanyId = array_key_exists('company_id', $data) ? (int) $data['company_id'] : (int) $oldCompanyId;

        // If company changed, clear stale optional relations
        if ((int) $oldCompanyId !== $newCompanyId) {
            if (!array_key_exists('contact_id', $data) && $quotation->contact_id) {
                $contact = Contact::find($quotation->contact_id);
                if ($contact && (int) $contact->company_id !== $newCompanyId) {
                    $data['contact_id'] = null;
                }
            }
            if (!array_key_exists('opportunity_id', $data) && $quotation->opportunity_id) {
                $opp = Opportunity::find($quotation->opportunity_id);
                if ($opp && (int) $opp->company_id !== $newCompanyId) {
                    $data['opportunity_id'] = null;
                }
            }
            if (!array_key_exists('request_id', $data) && $quotation->request_id) {
                $req = Request::find($quotation->request_id);
                if ($req && (int) $req->company_id !== $newCompanyId) {
                    $data['request_id'] = null;
                }
            }
        }

        $this->validateRelationshipIntegrity($quotation, $data, $newCompanyId);

        return DB::transaction(function () use ($quotation, $data, $updatedBy) {
            $oldValues = $this->auditValues($quotation);

            // Resolve items
            $updateItems = array_key_exists('items', $data);
            $itemsData   = $data['items'] ?? null;
            unset($data['items']);

            // Calculate monetary fields
            if ($updateItems && !empty($itemsData)) {
                // Delete and re-create items (replace strategy)
                $quotation->items()->delete();

                $calculatedItems = [];
                foreach ($itemsData as $index => $item) {
                    $lineTotal = $this->calculator->itemLineTotal($item['quantity'], $item['unit_price']);
                    QuotationItem::create([
                        'quotation_id' => $quotation->id,
                        'description'  => $item['description'],
                        'quantity'     => (string) $item['quantity'],
                        'unit_price'   => (string) $item['unit_price'],
                        'line_total'   => $lineTotal,
                        'sort_order'   => $item['sort_order'] ?? $index,
                    ]);
                    $calculatedItems[] = ['quantity' => $item['quantity'], 'unit_price' => $item['unit_price']];
                }
                $subtotal = $this->calculator->subtotalFromLines($calculatedItems);
                $data['subtotal'] = $subtotal;
            } else {
                // Items unchanged, use current subtotal
                $subtotal = $quotation->subtotal;
            }

            // Recalculate total with potentially updated discount/tax
            $discount = array_key_exists('discount_amount', $data)
                ? (string) $data['discount_amount']
                : (string) $quotation->discount_amount;
            $tax = array_key_exists('tax_amount', $data)
                ? (string) $data['tax_amount']
                : (string) $quotation->tax_amount;

            $data['total_amount'] = $this->calculator->total($subtotal, $discount, $tax);

            if (array_key_exists('currency', $data)) {
                $data['currency'] = strtoupper($data['currency']);
            }

            $quotation->update($data);
            $quotation->refresh();

            $newValues = $this->auditValues($quotation);

            if ($oldValues !== $newValues) {
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Quotation',
            entity: $quotation,
            oldValues: $oldValues,
            newValues: $newValues,
            metadata: [
                                'quotation_id'        => $quotation->id,
                                'quotation_reference' => $quotation->reference,
                            ]
        );
            }

            return $quotation;
        });
    }

    private function validateRelationshipIntegrity(Quotation $quotation, array $data, int $companyId): void
    {
        $contactId = array_key_exists('contact_id', $data) ? $data['contact_id'] : $quotation->contact_id;
        if ($contactId) {
            $contact = Contact::find($contactId);
            if ($contact && (int) $contact->company_id !== $companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        $opportunityId = array_key_exists('opportunity_id', $data) ? $data['opportunity_id'] : $quotation->opportunity_id;
        if ($opportunityId) {
            $opp = Opportunity::find($opportunityId);
            if ($opp && (int) $opp->company_id !== $companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        $requestId = array_key_exists('request_id', $data) ? $data['request_id'] : $quotation->request_id;
        if ($requestId) {
            $req = Request::find($requestId);
            if ($req && (int) $req->company_id !== $companyId) {
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

<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;

class InvoiceDocumentBuilder
{
    /**
     * Build the client-visible invoice document shared by API view, print, and PDF.
     *
     * @return array<string, mixed>
     */
    public function build(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'company',
            'customerUser',
            'soldByEmployee.user',
            'contract',
            'activeService',
            'items.serviceCatalog',
            'payments',
        ]);

        return [
            'reference' => $invoice->reference,
            'status' => $invoice->status->value,
            'customer' => [
                'name' => $invoice->billing_name ?: $invoice->company?->name ?: $invoice->customerUser?->name,
                'email' => $invoice->billing_email ?: $invoice->company?->email ?: $invoice->customerUser?->email,
                'phone' => $invoice->billing_phone ?: $invoice->company?->phone,
                'address' => $invoice->billing_address ?: $invoice->company?->city,
            ],
            'company_name' => $invoice->company?->name,
            'sales_owner' => $invoice->sales_employee_name_snapshot ?: $invoice->soldByEmployee?->user?->name,
            'contract_reference' => $invoice->contract?->reference,
            'active_service_reference' => $invoice->activeService?->reference,
            'issue_date' => $invoice->issue_date?->format('Y-m-d'),
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'currency' => $invoice->currency,
            'items' => $invoice->items->values()->map(
                fn (InvoiceItem $item, int $index) => [
                    'service' => $item->serviceCatalog?->name_en ?: $item->service_type ?: 'Service ' . ($index + 1),
                    'service_name' => $item->service_name_snapshot ?: $item->description,
                    'description' => $item->description,
                    'service_details' => $item->service_details,
                    'booking_reference' => $item->booking_reference,
                    'service_start_date' => $item->service_start_date?->format('Y-m-d'),
                    'service_end_date' => $item->service_end_date?->format('Y-m-d'),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ]
            )->all(),
            'subtotal' => $invoice->subtotal,
            'discount_amount' => $invoice->discount_amount,
            'tax_amount' => $invoice->tax_amount,
            'total_amount' => $invoice->total_amount,
            'paid_amount' => $invoice->postedPaymentsTotal(),
            'balance_due' => $invoice->balanceDue(),
            'notes' => $invoice->notes,
            'terms' => $invoice->terms,
        ];
    }
}

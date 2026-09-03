<?php

namespace App\Http\Requests;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $invoice = $this->route('invoice');

        if (!$user || !$user->can('manage_invoices')) {
            return false;
        }

        if (!$invoice instanceof Invoice) {
            return false;
        }

        if ($invoice->status === InvoiceStatus::ISSUED) {
            return $user->hasAnyRole(['admin', 'super_admin']);
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'customer_type'       => ['sometimes', Rule::in(InvoiceCustomerType::values())],
            'company_id'          => ['nullable', 'integer', 'exists:companies,id'],
            'customer_user_id'    => ['nullable', 'integer', 'exists:users,id'],
            'sold_by_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'contract_id'         => ['nullable', 'integer', 'exists:contracts,id'],
            'active_service_id'   => ['nullable', 'integer', 'exists:active_services,id'],
            'currency'            => ['sometimes', 'string', Rule::in(config('finance.supported_currencies', []))],
            'issue_date'          => ['nullable', 'date'],
            'due_date'            => ['nullable', 'date'],
            'discount_amount'     => ['nullable', 'numeric', 'min:0'],
            'tax_amount'          => ['nullable', 'numeric', 'min:0'],
            'notes'               => ['nullable', 'string'],
            'internal_notes'      => ['nullable', 'string'],
            'terms'               => ['nullable', 'string'],
            'items'               => ['sometimes', 'array', 'min:1'],
            'items.*.description' => ['required_with:items', 'string'],
            'items.*.service_catalog_id' => [
                'nullable',
                'integer',
                Rule::exists('service_catalogs', 'id')->where(fn ($query) => $query
                    ->where('active', true)
                    ->where('available_for_invoice', true)
                ),
            ],
            'items.*.service_type' => ['nullable', Rule::in(config('finance.invoice_service_types', []))],
            'items.*.service_name_snapshot' => ['nullable', 'string', 'max:255'],
            'items.*.service_details' => ['nullable', 'string'],
            'items.*.service_start_date' => ['nullable', 'date'],
            'items.*.service_end_date' => ['nullable', 'date'],
            'items.*.booking_reference' => ['nullable', 'string', 'max:255'],
            'items.*.supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'items.*.quantity'    => ['required_with:items', 'numeric', 'gt:0'],
            'items.*.unit_price'  => ['required_with:items', 'numeric', 'min:0'],
            'items.*.purchase_unit_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.purchase_currency' => ['nullable', 'string', Rule::in(config('finance.supported_currencies', []))],
            'items.*.exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'items.*.sort_order'  => ['nullable', 'integer'],
        ];
    }
}

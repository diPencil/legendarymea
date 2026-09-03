<?php

namespace App\Http\Requests;

use App\Enums\InvoiceCustomerType;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_invoices');
    }

    public function rules(): array
    {
        return [
            'customer_type'      => ['required', Rule::in(InvoiceCustomerType::values())],
            'company_id'         => ['nullable', 'integer', 'exists:companies,id'],
            'customer_user_id'   => ['nullable', 'integer', 'exists:users,id'],
            'sold_by_employee_id'=> ['nullable', 'integer', 'exists:employees,id'],
            'contract_id'        => ['nullable', 'integer', 'exists:contracts,id'],
            'active_service_id'  => ['nullable', 'integer', 'exists:active_services,id'],
            'currency'           => ['required', 'string', Rule::in(config('finance.supported_currencies', []))],
            'issue_date'         => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date'],
            'discount_amount'    => ['nullable', 'numeric', 'min:0'],
            'tax_amount'         => ['nullable', 'numeric', 'min:0'],
            'notes'              => ['nullable', 'string'],
            'internal_notes'     => ['nullable', 'string'],
            'terms'              => ['nullable', 'string'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.description'=> ['required', 'string'],
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
            'items.*.quantity'   => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.purchase_unit_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.purchase_currency' => ['nullable', 'string', Rule::in(config('finance.supported_currencies', []))],
            'items.*.exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'items.*.sort_order' => ['nullable', 'integer'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $customerType = $this->input('customer_type');

        if (!$customerType) {
            $customerType = InvoiceCustomerType::COMPANY->value;
        }

        $this->merge([
            'customer_type' => $customerType,
        ]);
    }
}

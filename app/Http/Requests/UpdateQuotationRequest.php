<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuotationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Controller handles authorization
    }

    public function rules(): array
    {
        return [
            'company_id'      => ['sometimes', 'required', 'exists:companies,id'],
            'contact_id'      => ['nullable', 'exists:contacts,id'],
            'opportunity_id'  => ['nullable', 'exists:opportunities,id'],
            'request_id'      => ['nullable', 'exists:requests,id'],
            'currency'        => ['sometimes', 'required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount'      => ['nullable', 'numeric', 'min:0'],
            'issue_date'      => ['nullable', 'date'],
            'valid_until'     => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
            'terms'           => ['nullable', 'string'],

            'items'                => ['sometimes', 'array', 'min:1'],
            'items.*.description'  => ['required_with:items', 'string', 'max:1000'],
            'items.*.quantity'     => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unit_price'   => ['required_with:items', 'numeric', 'min:0'],
            'items.*.sort_order'   => ['nullable', 'integer', 'min:0'],
        ];
    }
}

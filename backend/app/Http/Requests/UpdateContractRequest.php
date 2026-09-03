<?php

namespace App\Http\Requests;

use App\Enums\ContractStatus;
use App\Enums\CurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'          => ['sometimes', 'required', 'string', 'max:255'],
            'company_id'     => ['sometimes', 'required', 'integer', 'exists:companies,id'],
            'status'         => ['sometimes', 'required', Rule::in([ContractStatus::DRAFT->value, ContractStatus::ACTIVE->value])],
            'contact_id'     => ['nullable', 'integer', 'exists:contacts,id'],
            'quotation_id'   => ['nullable', 'integer', 'exists:quotations,id'],
            
            'start_date'     => ['nullable', 'date'],
            'end_date'       => ['nullable', 'date', 'after_or_equal:start_date'],
            'signed_at'      => ['nullable', 'date'],
            
            'contract_value' => ['nullable', 'numeric', 'min:0'],
            'currency'       => [
                'nullable', 
                'string', 
                'size:3',
                Rule::in(CurrencyCode::values()),
                Rule::requiredIf(fn () => $this->filled('contract_value'))
            ],
            
            'terms'          => ['nullable', 'string'],
            'notes'          => ['nullable', 'string'],
            'additional_terms_en' => ['nullable', 'string'],
            'additional_terms_ar' => ['nullable', 'string'],
            'scope_of_work_en' => ['nullable', 'string'],
            'scope_of_work_ar' => ['nullable', 'string'],
            'payment_terms_en' => ['nullable', 'string'],
            'payment_terms_ar' => ['nullable', 'string'],
            'contract_content' => ['nullable', 'array'],
            'contract_content.*.key' => ['required_with:contract_content', 'string', 'max:120'],
            'contract_content.*.page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'contract_content.*.kind' => ['nullable', 'string', 'max:80'],
            'contract_content.*.title_en' => ['required_with:contract_content', 'string', 'max:255'],
            'contract_content.*.title_ar' => ['required_with:contract_content', 'string', 'max:255'],
            'contract_content.*.clauses' => ['required_with:contract_content', 'array', 'min:1'],
            'contract_content.*.clauses.*.en' => ['nullable', 'string'],
            'contract_content.*.clauses.*.ar' => ['nullable', 'string'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRenewalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_renewals');
    }

    public function rules(): array
    {
        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'contract_id' => ['required', 'integer', 'exists:contracts,id'],
            'active_service_id' => ['nullable', 'integer', 'exists:active_services,id'],
            'renewal_due_date' => ['required', 'date'],
            'proposed_start_date' => ['nullable', 'date'],
            'proposed_end_date' => ['nullable', 'date', 'after_or_equal:proposed_start_date'],
            'renewal_amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

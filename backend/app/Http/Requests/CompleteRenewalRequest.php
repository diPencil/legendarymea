<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteRenewalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_renewals');
    }

    public function rules(): array
    {
        return [
            'renewed_contract_id' => ['required', 'integer', 'exists:contracts,id'],
        ];
    }
}

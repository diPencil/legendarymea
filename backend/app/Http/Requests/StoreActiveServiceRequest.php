<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActiveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_active_services');
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'service_catalog_id' => [
                'required',
                Rule::exists('service_catalogs', 'id')
                    ->where('active', true)
                    ->where('available_for_active_service', true),
            ],
            'description' => ['nullable', 'string'],
            'company_id' => ['required', 'exists:companies,id'],
            'contract_id' => ['required', 'exists:contracts,id'],
            'client_onboarding_id' => ['nullable', 'exists:client_onboardings,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company_id' => 'nullable|exists:companies,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'person_name' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|max:10',
            'source' => ['nullable', 'string', Rule::enum(\App\Enums\LeadSource::class)],
            'service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
            'status' => ['nullable', 'string', Rule::enum(\App\Enums\LeadStatus::class), Rule::notIn([\App\Enums\LeadStatus::CONVERTED->value])],
            'priority' => ['nullable', 'string', Rule::enum(\App\Enums\LeadPriority::class)],
            'estimated_value' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'next_follow_up_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }

    private function serviceCatalogRule(): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists('service_catalogs', 'code')->where(fn ($query) => $query
            ->where('active', true)
            ->where('show_in_contact', true)
        );
    }
    
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $companyId = $this->input('company_id', $this->route('lead')?->company_id);
            $contactId = $this->input('contact_id', $this->route('lead')?->contact_id);

            if ($companyId && $contactId) {
                $contact = \App\Models\Contact::find($contactId);
                if ($contact && $contact->company_id && $contact->company_id != $companyId) {
                    $validator->errors()->add('contact_id', __('invalid Company/Contact combination'));
                }
            }
            
            // Prevent changing status if currently converted
            if ($this->route('lead')?->status === \App\Enums\LeadStatus::CONVERTED && $this->input('status') && $this->input('status') !== \App\Enums\LeadStatus::CONVERTED->value) {
                $validator->errors()->add('status', __('Cannot change status of a converted lead'));
            }
        });
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\OpportunityStage;
use Illuminate\Validation\Rule;
use App\Models\Contact;

class ConvertLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company.mode' => 'required|string|in:existing,create',
            'company.id' => 'required_if:company.mode,existing|nullable|exists:companies,id',
            'company.data' => 'required_if:company.mode,create|nullable|array',
            'company.data.name' => 'required_if:company.mode,create|nullable|string|max:255',
            'company.data.legal_name' => 'nullable|string|max:255',
            'company.data.website' => 'nullable|string|max:255',
            'company.data.email' => 'nullable|email|max:255',
            'company.data.phone' => 'nullable|string|max:255',
            'company.data.industry' => 'nullable|string|max:255',
            
            'contact.mode' => 'required|string|in:existing,create,none',
            'contact.id' => 'required_if:contact.mode,existing|nullable|exists:contacts,id',
            'contact.data' => 'required_if:contact.mode,create|nullable|array',
            'contact.data.first_name' => 'required_if:contact.mode,create|nullable|string|max:255',
            'contact.data.last_name' => 'nullable|string|max:255',
            'contact.data.email' => 'nullable|email|max:255',
            'contact.data.phone' => 'nullable|string|max:255',
            'contact.data.is_primary' => 'nullable|boolean',

            'opportunity' => 'required|array',
            'opportunity.name' => 'required|string|max:255',
            'opportunity.owner_id' => 'nullable|exists:employees,id',
            'opportunity.stage' => ['nullable', 'string', Rule::in([
                OpportunityStage::QUALIFICATION->value,
                OpportunityStage::DISCOVERY->value,
                OpportunityStage::PROPOSAL->value,
                OpportunityStage::NEGOTIATION->value
            ])],
            'opportunity.probability' => 'nullable|integer|min:0|max:100',
            'opportunity.estimated_value' => 'nullable|numeric|min:0',
            'opportunity.currency' => 'nullable|string|size:3',
            'opportunity.expected_close_date' => 'nullable|date',
            'opportunity.service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
            'opportunity.notes' => 'nullable|string',
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
            $companyMode = $this->input('company.mode');
            $companyId = $this->input('company.id');
            $contactMode = $this->input('contact.mode');
            $contactId = $this->input('contact.id');

            if ($contactMode === 'existing' && $contactId) {
                $contact = Contact::find($contactId);
                
                if ($companyMode === 'create' && $contact && $contact->company_id) {
                    $validator->errors()->add('contact.id', __('invalid Company/Contact combination'));
                } elseif ($companyMode === 'existing' && $contact && $contact->company_id && $contact->company_id != $companyId) {
                    $validator->errors()->add('contact.id', __('invalid Company/Contact combination'));
                }
            }
        });
    }
}

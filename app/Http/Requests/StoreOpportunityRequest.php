<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\OpportunityStage;
use App\Models\Contact;
use App\Models\Lead;

class StoreOpportunityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'company_id' => ['required', 'exists:companies,id'],
            'primary_contact_id' => [
                'nullable', 
                'exists:contacts,id',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $contact = Contact::find($value);
                        if ($contact && $contact->company_id != $this->company_id) {
                            $fail('The selected contact does not belong to the selected company.');
                        }
                    }
                },
            ],
            'lead_id' => ['nullable', 'exists:leads,id'],
            'owner_id' => ['required', 'exists:employees,id'],
            'service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
            'stage' => ['nullable', 'string', Rule::in([
                OpportunityStage::QUALIFICATION->value,
                OpportunityStage::DISCOVERY->value,
                OpportunityStage::PROPOSAL->value,
                OpportunityStage::NEGOTIATION->value,
            ])],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    private function serviceCatalogRule(): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists('service_catalogs', 'code')->where(fn ($query) => $query
            ->where('active', true)
            ->where('show_in_contact', true)
        );
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $leadId = $this->input('lead_id');
            $companyId = $this->input('company_id');

            if (!$leadId || !$companyId) {
                return;
            }

            $lead = Lead::find($leadId);
            if ($lead && $lead->company_id && (int) $lead->company_id !== (int) $companyId) {
                $validator->errors()->add('lead_id', 'The selected lead does not belong to the selected company.');
            }
        });
    }
}

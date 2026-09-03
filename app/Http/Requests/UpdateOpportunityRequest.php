<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Contact;

class UpdateOpportunityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $opportunity = $this->route('opportunity');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'primary_contact_id' => [
                'nullable', 
                'exists:contacts,id',
                function ($attribute, $value, $fail) use ($opportunity) {
                    if ($value) {
                        $contact = Contact::find($value);
                        $companyId = $this->input('company_id', $opportunity->company_id);
                        if ($contact && $contact->company_id != $companyId) {
                            $fail('The selected contact does not belong to the selected company.');
                        }
                    }
                },
            ],
            'service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
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
}

<?php

namespace App\Http\Requests;

use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use App\Models\Contact;
use App\Models\Opportunity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Illuminate\Validation\Rule;

class UpdateRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $businessRequest = $this->route('businessRequest');

        return [
            'company_id' => ['sometimes', 'required', 'exists:companies,id'],
            'contact_id' => [
                'nullable',
                'exists:contacts,id',
                function ($attribute, $value, $fail) use ($businessRequest) {
                    if ($value) {
                        $companyId = $this->input('company_id', $businessRequest->company_id);
                        $contact = Contact::find($value);
                        if ($contact && (int) $contact->company_id !== (int) $companyId) {
                            $fail('The selected contact does not belong to the selected company.');
                        }
                    }
                },
            ],
            'opportunity_id' => [
                'nullable',
                'exists:opportunities,id',
                function ($attribute, $value, $fail) use ($businessRequest) {
                    if ($value) {
                        $companyId = $this->input('company_id', $businessRequest->company_id);
                        $opportunity = Opportunity::find($value);
                        if ($opportunity && (int) $opportunity->company_id !== (int) $companyId) {
                            $fail('The selected opportunity does not belong to the selected company.');
                        }
                    }
                },
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
            'status' => ['nullable', 'string', Rule::enum(RequestStatus::class)],
            'priority' => ['nullable', 'string', Rule::enum(RequestPriority::class)],
            'due_at' => ['nullable', 'date'],
            'assigned_to' => ['prohibited'],
            'reference' => ['prohibited'],
            'started_at' => ['prohibited'],
            'completed_at' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }

    private function serviceCatalogRule(): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists('service_catalogs', 'code')->where(fn ($query) => $query
            ->where('active', true)
            ->where('show_in_contact', true)
        );
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $businessRequest = $this->route('businessRequest');
            $companyId = (int) $this->input('company_id', $businessRequest->company_id);

            $contactId = $this->has('contact_id') ? $this->input('contact_id') : $businessRequest->contact_id;
            if ($contactId) {
                $contact = Contact::find($contactId);
                if ($contact && (int) $contact->company_id !== $companyId) {
                    $validator->errors()->add('contact_id', 'The selected contact does not belong to the selected company.');
                }
            }

            $opportunityId = $this->has('opportunity_id') ? $this->input('opportunity_id') : $businessRequest->opportunity_id;
            if ($opportunityId) {
                $opportunity = Opportunity::find($opportunityId);
                if ($opportunity && (int) $opportunity->company_id !== $companyId) {
                    $validator->errors()->add('opportunity_id', 'The selected opportunity does not belong to the selected company.');
                }
            }
        });
    }
}

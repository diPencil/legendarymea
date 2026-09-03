<?php

namespace App\Http\Requests;

use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use App\Models\Contact;
use App\Models\Opportunity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'contact_id' => [
                'nullable',
                'exists:contacts,id',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $contact = Contact::find($value);
                        if ($contact && (int) $contact->company_id !== (int) $this->input('company_id')) {
                            $fail('The selected contact does not belong to the selected company.');
                        }
                    }
                },
            ],
            'opportunity_id' => [
                'nullable',
                'exists:opportunities,id',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $opportunity = Opportunity::find($value);
                        if ($opportunity && (int) $opportunity->company_id !== (int) $this->input('company_id')) {
                            $fail('The selected opportunity does not belong to the selected company.');
                        }
                    }
                },
            ],
            'assigned_to' => ['nullable', 'exists:employees,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'service_interest' => ['nullable', 'string', $this->serviceCatalogRule()],
            'status' => ['nullable', 'string', Rule::enum(RequestStatus::class)],
            'priority' => ['nullable', 'string', Rule::enum(RequestPriority::class)],
            'due_at' => ['nullable', 'date'],
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
}

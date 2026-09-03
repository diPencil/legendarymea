<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
            'request_id' => ['nullable', 'integer', 'exists:requests,id'],
            'task_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'follow_up_id' => ['nullable', 'integer', 'exists:follow_ups,id'],
        ];
    }
}

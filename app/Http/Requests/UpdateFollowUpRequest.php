<?php

namespace App\Http\Requests;

use App\Enums\FollowUpStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFollowUpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // handled by controller
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', 'string', Rule::enum(FollowUpStatus::class)],
            'follow_up_at' => ['sometimes', 'required', 'date'],
            
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
            'request_id' => ['nullable', 'integer', 'exists:requests,id'],
            'task_id' => ['nullable', 'integer', 'exists:tasks,id'],
            
            // assigned_to explicitly rejected from normal updates
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // handled by policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // file is NOT allowed to be replaced
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            
            'company_id' => 'nullable|exists:companies,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'lead_id' => 'nullable|exists:leads,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'request_id' => 'nullable|exists:requests,id',
            'task_id' => 'nullable|exists:tasks,id',
            'follow_up_id' => 'nullable|exists:follow_ups,id',
            'note_id' => 'nullable|exists:notes,id',
        ];
    }
}

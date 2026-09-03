<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignFollowUpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['nullable', 'integer', 'exists:employees,id'],
        ];
    }
}

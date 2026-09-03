<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_approvals');
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}

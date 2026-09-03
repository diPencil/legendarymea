<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_approvals');
    }

    public function rules(): array
    {
        return [
            'request_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

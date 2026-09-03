<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecisionApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('decide_approvals');
    }

    public function rules(): array
    {
        return [
            'decision_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

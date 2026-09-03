<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_client_onboardings');
    }

    public function rules(): array
    {
        return [
            'assigned_to' => 'nullable|exists:users,id',
            'kickoff_date' => 'nullable|date',
            'target_go_live_date' => 'nullable|date|after_or_equal:kickoff_date',
            'requirements' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;

class StoreClientOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'create_client_onboardings', 'manage_client_onboardings');
    }

    public function rules(): array
    {
        return [
            'company_id' => 'required|exists:companies,id',
            'contract_id' => 'required|exists:contracts,id',
            'assigned_to' => 'nullable|exists:users,id',
            'kickoff_date' => 'nullable|date',
            'target_go_live_date' => 'nullable|date|after_or_equal:kickoff_date',
            'requirements' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}

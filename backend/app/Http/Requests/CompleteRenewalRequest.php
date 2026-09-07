<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;

class CompleteRenewalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'complete_renewals', 'manage_renewals');
    }

    public function rules(): array
    {
        return [
            'renewed_contract_id' => ['required', 'integer', 'exists:contracts,id'],
        ];
    }
}

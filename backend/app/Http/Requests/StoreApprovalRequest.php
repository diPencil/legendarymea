<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;

class StoreApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'create_approvals', 'manage_approvals');
    }

    public function rules(): array
    {
        return [
            'quotation_id' => ['required', 'integer', 'exists:quotations,id'],
            'request_note' => ['nullable', 'string', 'max:2000'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}

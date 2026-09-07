<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;

class AssignApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'update_approvals', 'manage_approvals');
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}

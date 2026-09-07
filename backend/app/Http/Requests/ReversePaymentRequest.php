<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;

class ReversePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'reverse_payments', 'manage_payments');
    }

    public function rules(): array
    {
        return [
            'reversal_reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}

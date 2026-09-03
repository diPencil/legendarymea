<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReversePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_payments');
    }

    public function rules(): array
    {
        return [
            'reversal_reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}

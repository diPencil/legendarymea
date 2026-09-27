<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierBalanceAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'adjust_supplier_balances', 'manage_suppliers');
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'not_in:0'],
            'currency' => ['required', 'string', Rule::in(config('finance.supported_currencies', []))],
            'reason' => ['required', 'string', 'max:1000'],
            'transaction_date' => ['nullable', 'date'],
        ];
    }
}

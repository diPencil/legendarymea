<?php

namespace App\Http\Requests;

use App\Rules\CurrencyAmount;
use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierBalanceFundingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('fund_supplier_balances');
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0', new CurrencyAmount((string) $this->input('currency', 'AED'))],
            'currency' => ['required', 'string', Rule::in(config('finance.supported_currencies', []))],
            'transaction_date' => ['required', 'date'],
            'payment_method' => ['nullable', Rule::in(array_column(PaymentMethod::cases(), 'value'))],
            'external_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

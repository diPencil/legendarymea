<?php

namespace App\Http\Requests;

use App\Models\Invoice;
use App\Rules\CurrencyAmount;
use App\Enums\PaymentMethod;
use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StorePaymentRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (!$this->filled('idempotency_key') && $this->hasHeader('Idempotency-Key')) {
            $this->merge([
                'idempotency_key' => trim((string) $this->header('Idempotency-Key')),
            ]);
        }
    }

    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'create_payments', 'manage_payments');
    }

    public function rules(): array
    {
        $currency = $this->filled('currency')
            ? strtoupper((string) $this->input('currency'))
            : ($this->filled('invoice_id') ? (Invoice::query()->whereKey($this->input('invoice_id'))->value('currency') ?? 'AED') : 'AED');

        $isMultiInvoice = $this->filled('company_id') || $this->filled('allocations') || $this->boolean('auto_allocate');

        $rules = [
            'idempotency_key' => ['nullable', 'string', 'max:64'],
            'amount' => ['required', 'numeric', 'gt:0', new CurrencyAmount($currency)],
            'method' => ['required', new Enum(PaymentMethod::class)],
            'transaction_reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];

        if ($isMultiInvoice) {
            $rules['company_id'] = ['required', 'integer', 'exists:companies,id'];
            $rules['currency'] = ['required', 'string', Rule::in(config('finance.supported_currencies', []))];
            $rules['allocations'] = ['sometimes', 'array'];
            $rules['allocations.*.invoice_id'] = ['required', 'integer', 'exists:invoices,id'];
            $rules['allocations.*.amount'] = ['required', 'numeric', 'gt:0', new CurrencyAmount($currency)];
            $rules['allocations.*.notes'] = ['nullable', 'string'];
            $rules['auto_allocate'] = ['sometimes', 'boolean'];
            $rules['invoice_id'] = ['nullable', 'integer', 'exists:invoices,id'];
        } else {
            $rules['invoice_id'] = ['required', 'integer', 'exists:invoices,id'];
            $rules['currency'] = ['sometimes', 'string', Rule::in(config('finance.supported_currencies', []))];
            $rules['company_id'] = ['nullable', 'integer', 'exists:companies,id'];
        }

        return $rules;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('invoice_id') && $this->filled('currency')) {
                $invoiceCurrency = Invoice::query()->whereKey($this->input('invoice_id'))->value('currency');
                if ($invoiceCurrency && strtoupper((string) $this->input('currency')) !== strtoupper($invoiceCurrency)) {
                    $validator->errors()->add('currency', 'Payment currency must match the invoice currency.');
                }
            }
        });
    }
}

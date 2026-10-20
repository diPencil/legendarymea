<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

use App\Models\PaymentAllocation;

class CreatePaymentService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
        private InvoiceSettlementService $invoiceSettlementService,
        private PaymentAllocationService $paymentAllocationService,
    ) {}

    public function execute(array $data, int $userId): Payment
    {
        if (!empty($data['auto_allocate']) || !empty($data['allocations']) || empty($data['invoice_id'])) {
            return $this->paymentAllocationService->createMultiInvoicePayment($data, $userId);
        }

        try {
            return DB::transaction(function () use ($data, $userId) {
                $invoice = Invoice::query()
                    ->with(['company', 'customerUser'])
                    ->whereKey($data['invoice_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($existing = $this->findIdempotentPayment($data)) {
                    return $this->resolveIdempotentPayment($existing, $data);
                }

                $this->validateInvoice($invoice, $data['amount']);
                $amount = Money::normalize($data['amount'], $invoice->currency);

                $payment = Payment::create([
                    'reference' => $this->referenceGenerator->generate(
                        'LM-PAY-' . date('Y') . '-',
                        'payments',
                        'reference',
                        6
                    ),
                    'idempotency_key' => $data['idempotency_key'] ?? null,
                    'invoice_id' => $invoice->id,
                    'customer_type' => $invoice->customer_type,
                    'company_id' => $invoice->company_id,
                    'customer_user_id' => $invoice->customer_user_id,
                    'status' => PaymentStatus::POSTED,
                    'amount' => $amount,
                    'allocated_amount' => $amount,
                    'unallocated_amount' => Money::normalize(0, $invoice->currency),
                    'currency' => $invoice->currency,
                    'method' => $data['method'],
                    'transaction_reference' => $data['transaction_reference'] ?? null,
                    'paid_at' => $data['paid_at'],
                    'notes' => $data['notes'] ?? null,
                    'recorded_by' => $userId,
                ]);

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'amount' => $amount,
                    'notes' => $data['notes'] ?? null,
                ]);

                $this->invoiceSettlementService->recalculate($invoice);

                SystemActivityService::record(
                    actor: auth()->user(),
                    action: 'created',
                    module: 'Payment',
                    entity: $payment,
                    oldValues: [],
                    newValues: $payment->only([
                        'id',
                        'reference',
                        'invoice_id',
                        'company_id',
                        'customer_user_id',
                        'amount',
                        'currency',
                        'status',
                        'method',
                        'transaction_reference',
                        'paid_at',
                        'recorded_by',
                    ]),
                    metadata: [
                        'payment_reference' => $payment->reference,
                        'invoice_reference' => $invoice->reference,
                        'company_id' => $payment->company_id,
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ]
                );

                return $this->loadPayment($payment);
            }, 3);
        } catch (QueryException $exception) {
            if (($data['idempotency_key'] ?? null) === null || (string) $exception->getCode() !== '23000') {
                throw $exception;
            }

            $existing = Payment::query()->where('idempotency_key', $data['idempotency_key'])->first();
            if (!$existing) {
                throw $exception;
            }

            return $this->resolveIdempotentPayment($existing, $data);
        }
    }

    private function findIdempotentPayment(array $data): ?Payment
    {
        $key = $data['idempotency_key'] ?? null;

        return $key ? Payment::query()->where('idempotency_key', $key)->first() : null;
    }

    private function resolveIdempotentPayment(Payment $payment, array $data): Payment
    {
        $method = $payment->method instanceof \BackedEnum ? $payment->method->value : (string) $payment->method;
        $sameRequest = (int) $payment->invoice_id === (int) $data['invoice_id']
            && Money::compare(Money::normalize($payment->amount, $payment->currency), Money::normalize($data['amount'], $payment->currency)) === 0
            && $method === (string) $data['method']
            && ($payment->transaction_reference ?? null) === ($data['transaction_reference'] ?? null)
            && ($payment->notes ?? null) === ($data['notes'] ?? null)
            && $payment->paid_at?->getTimestamp() === Carbon::parse($data['paid_at'])->getTimestamp();

        if (!$sameRequest) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['This idempotency key has already been used for a different payment request.'],
            ]);
        }

        return $this->loadPayment($payment);
    }

    private function loadPayment(Payment $payment): Payment
    {
        return $payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser', 'allocations.invoice']);
    }

    private function validateInvoice(Invoice $invoice, mixed $amount): void
    {
        if (!in_array($invoice->status, [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE], true)) {
            throw ValidationException::withMessages([
                'invoice_id' => ['Payments may only be recorded against issued, partially paid, or overdue invoices.'],
            ]);
        }

        $remainingMinorUnits = $this->invoiceSettlementService->balanceDueMinorUnits($invoice);
        $amountMinorUnits = Money::toMinorUnits($amount, $invoice->currency);

        if ($amountMinorUnits <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Payment amount must be greater than zero.'],
            ]);
        }

        if ($amountMinorUnits > $remainingMinorUnits) {
            throw ValidationException::withMessages([
                'amount' => ['Payment amount exceeds the remaining invoice balance.'],
            ]);
        }
    }

}

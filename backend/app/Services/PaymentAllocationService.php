<?php

namespace App\Services;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Support\Decimal;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentAllocationService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
        private InvoiceSettlementService $invoiceSettlementService,
    ) {}

    public function createMultiInvoicePayment(array $data, int $userId): Payment
    {
        try {
            return DB::transaction(function () use ($data, $userId) {
                if ($existing = $this->findIdempotentPayment($data)) {
                    return $this->resolveIdempotentPayment($existing, $data);
                }

                $company = Company::findOrFail($data['company_id']);
                $currency = strtoupper((string) $data['currency']);
                $totalAmount = Money::normalize($data['amount'], $currency);

                if (Money::compare($totalAmount, 0) <= 0) {
                    throw ValidationException::withMessages([
                        'amount' => ['Payment amount must be greater than zero.'],
                    ]);
                }

                $payment = Payment::create([
                    'reference' => $this->referenceGenerator->generate(
                        'LM-PAY-' . date('Y') . '-',
                        'payments',
                        'reference',
                        6
                    ),
                    'idempotency_key' => $data['idempotency_key'] ?? null,
                    'invoice_id' => null,
                    'customer_type' => InvoiceCustomerType::COMPANY,
                    'company_id' => $company->id,
                    'customer_user_id' => null,
                    'status' => PaymentStatus::POSTED,
                    'amount' => $totalAmount,
                    'allocated_amount' => Money::normalize(0, $currency),
                    'unallocated_amount' => $totalAmount,
                    'currency' => $currency,
                    'method' => $data['method'],
                    'transaction_reference' => $data['transaction_reference'] ?? null,
                    'paid_at' => $data['paid_at'],
                    'notes' => $data['notes'] ?? null,
                    'recorded_by' => $userId,
                ]);

                if (!empty($data['auto_allocate'])) {
                    $this->allocateAutomatic($payment, $userId);
                } elseif (!empty($data['allocations']) && is_array($data['allocations'])) {
                    $this->allocateManual($payment, $data['allocations'], $userId);
                }

                $payment->refresh();

                SystemActivityService::record(
                    actor: auth()->user(),
                    action: 'created_multi_invoice',
                    module: 'Payment',
                    entity: $payment,
                    oldValues: [],
                    newValues: $payment->only([
                        'id',
                        'reference',
                        'company_id',
                        'amount',
                        'allocated_amount',
                        'unallocated_amount',
                        'currency',
                        'status',
                        'method',
                        'paid_at',
                    ]),
                    metadata: [
                        'payment_reference' => $payment->reference,
                        'company_id' => $payment->company_id,
                        'amount' => $payment->amount,
                        'allocated_amount' => $payment->allocated_amount,
                        'unallocated_amount' => $payment->unallocated_amount,
                        'currency' => $payment->currency,
                        'allocations_count' => $payment->allocations()->count(),
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

    public function allocateManual(Payment $payment, array $allocationsData, int $userId): void
    {
        if (empty($allocationsData)) {
            return;
        }

        $currency = $payment->currency;
        $seenInvoiceIds = [];
        $invoiceIds = [];

        foreach ($allocationsData as $index => $item) {
            $invoiceId = (int) ($item['invoice_id'] ?? 0);
            if ($invoiceId <= 0) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => ['A valid invoice ID is required for each allocation.'],
                ]);
            }

            if (isset($seenInvoiceIds[$invoiceId])) {
                throw ValidationException::withMessages([
                    'allocations' => ['Duplicate invoice allocations are not permitted in the same payment.'],
                ]);
            }

            $seenInvoiceIds[$invoiceId] = true;
            $invoiceIds[] = $invoiceId;
        }

        // Lock all invoices in deterministic order by ID to prevent deadlocks
        $invoices = Invoice::query()
            ->whereIn('id', $invoiceIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $totalAllocatedMinorUnits = 0;
        $allocationsToCreate = [];

        foreach ($allocationsData as $index => $item) {
            $invoiceId = (int) $item['invoice_id'];
            $invoice = $invoices->get($invoiceId);

            if (!$invoice) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => ["Invoice #{$invoiceId} does not exist."],
                ]);
            }

            if ((int) $invoice->company_id !== (int) $payment->company_id) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => ["Invoice {$invoice->reference} does not belong to the selected company."],
                ]);
            }

            if (strtoupper($invoice->currency) !== strtoupper($currency)) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => ["Invoice {$invoice->reference} currency ({$invoice->currency}) does not match payment currency ({$currency})."],
                ]);
            }

            if (!in_array($invoice->status, [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE], true)) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.invoice_id" => ["Invoice {$invoice->reference} status ({$invoice->status->value}) is not eligible for payment."],
                ]);
            }

            $allocatedAmount = Money::normalize($item['amount'], $currency);
            $allocatedMinorUnits = Money::toMinorUnits($allocatedAmount, $currency);

            if ($allocatedMinorUnits <= 0) {
                throw ValidationException::withMessages([
                    "allocations.{$index}.amount" => ['Allocation amount must be greater than zero.'],
                ]);
            }

            $remainingMinorUnits = $this->invoiceSettlementService->balanceDueMinorUnits($invoice);

            if ($allocatedMinorUnits > $remainingMinorUnits) {
                $maxFormatted = Money::fromMinorUnits($remainingMinorUnits, $currency);
                throw ValidationException::withMessages([
                    "allocations.{$index}.amount" => ["Allocation amount for invoice {$invoice->reference} exceeds its balance due ({$maxFormatted})."],
                ]);
            }

            $totalAllocatedMinorUnits += $allocatedMinorUnits;
            $allocationsToCreate[] = [
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'amount' => $allocatedAmount,
                'notes' => $item['notes'] ?? null,
                'reversed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $paymentAmountMinorUnits = Money::toMinorUnits($payment->amount, $currency);

        if ($totalAllocatedMinorUnits > $paymentAmountMinorUnits) {
            throw ValidationException::withMessages([
                'allocations' => ['Total allocated amount exceeds the total payment receipt amount.'],
            ]);
        }

        PaymentAllocation::insert($allocationsToCreate);

        $allocatedAmount = Money::fromMinorUnits($totalAllocatedMinorUnits, $currency);
        $unallocatedAmount = Money::fromMinorUnits($paymentAmountMinorUnits - $totalAllocatedMinorUnits, $currency);

        $payment->update([
            'allocated_amount' => $allocatedAmount,
            'unallocated_amount' => $unallocatedAmount,
            'paid_at' => $payment->paid_at,
        ]);

        foreach ($invoices as $invoice) {
            $this->invoiceSettlementService->recalculate($invoice);
        }
    }

    public function allocateAutomatic(Payment $payment, int $userId): void
    {
        $currency = $payment->currency;
        $remainingPaymentMinorUnits = Money::toMinorUnits($payment->amount, $currency);

        if ($remainingPaymentMinorUnits <= 0) {
            return;
        }

        // Fetch all outstanding invoices for this company & currency in deterministic FIFO order
        $outstandingInvoices = Invoice::query()
            ->where('company_id', $payment->company_id)
            ->where('currency', $currency)
            ->whereIn('status', [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE])
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC')
            ->orderBy('id', 'asc')
            ->lockForUpdate()
            ->get();

        $totalAllocatedMinorUnits = 0;
        $allocationsToCreate = [];
        $recalculatedInvoices = [];

        foreach ($outstandingInvoices as $invoice) {
            if ($remainingPaymentMinorUnits <= 0) {
                break;
            }

            $invoiceBalanceMinorUnits = $this->invoiceSettlementService->balanceDueMinorUnits($invoice);
            if ($invoiceBalanceMinorUnits <= 0) {
                continue;
            }

            $allocateMinorUnits = min($remainingPaymentMinorUnits, $invoiceBalanceMinorUnits);
            $allocatedAmount = Money::fromMinorUnits($allocateMinorUnits, $currency);

            $allocationsToCreate[] = [
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'amount' => $allocatedAmount,
                'notes' => 'Automatic FIFO allocation',
                'reversed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $totalAllocatedMinorUnits += $allocateMinorUnits;
            $remainingPaymentMinorUnits -= $allocateMinorUnits;
            $recalculatedInvoices[] = $invoice;
        }

        if (!empty($allocationsToCreate)) {
            PaymentAllocation::insert($allocationsToCreate);
        }

        $allocatedAmount = Money::fromMinorUnits($totalAllocatedMinorUnits, $currency);
        $unallocatedAmount = Money::fromMinorUnits($remainingPaymentMinorUnits, $currency);

        $payment->update([
            'allocated_amount' => $allocatedAmount,
            'unallocated_amount' => $unallocatedAmount,
            'paid_at' => $payment->paid_at,
        ]);

        foreach ($recalculatedInvoices as $invoice) {
            $this->invoiceSettlementService->recalculate($invoice);
        }
    }

    public function getOutstandingInvoices(int $companyId, ?string $currency = null): Collection
    {
        $query = Invoice::query()
            ->where('company_id', $companyId)
            ->whereIn('status', [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE])
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC')
            ->orderBy('id', 'asc');

        if ($currency) {
            $query->where('currency', strtoupper($currency));
        }

        return $query->get()->map(function (Invoice $invoice) {
            return [
                'id' => $invoice->id,
                'reference' => $invoice->reference,
                'company_id' => $invoice->company_id,
                'status' => $invoice->status->value,
                'currency' => $invoice->currency,
                'issue_date' => $invoice->issue_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'total_amount' => Money::normalize($invoice->total_amount, $invoice->currency),
                'paid_amount' => $invoice->postedPaymentsTotal(),
                'balance_due' => $invoice->balanceDue(),
            ];
        });
    }

    private function findIdempotentPayment(array $data): ?Payment
    {
        $key = $data['idempotency_key'] ?? null;

        return $key ? Payment::query()->where('idempotency_key', $key)->first() : null;
    }

    private function resolveIdempotentPayment(Payment $payment, array $data): Payment
    {
        $paymentMethod = $payment->method instanceof \BackedEnum ? $payment->method->value : (string) $payment->method;
        $requestMethod = ($data['method'] ?? null) instanceof \BackedEnum ? $data['method']->value : (string) ($data['method'] ?? '');
        $currency = strtoupper((string) ($data['currency'] ?? $payment->currency));

        $paymentTimestamp = $payment->paid_at ? Carbon::parse($payment->paid_at)->getTimestamp() : null;
        $requestTimestamp = !empty($data['paid_at']) ? Carbon::parse($data['paid_at'])->getTimestamp() : null;

        $sameRequest = (int) $payment->company_id === (int) ($data['company_id'] ?? 0)
            && strtoupper($payment->currency) === $currency
            && Money::compare(Money::normalize($payment->amount, $payment->currency), Money::normalize($data['amount'], $currency)) === 0
            && $paymentMethod === $requestMethod
            && ($payment->transaction_reference ?? null) === ($data['transaction_reference'] ?? null)
            && ($payment->notes ?? null) === ($data['notes'] ?? null)
            && $paymentTimestamp === $requestTimestamp;

        if (!$sameRequest) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['This idempotency key has already been used for a different payment request.'],
            ]);
        }

        return $this->loadPayment($payment);
    }

    private function loadPayment(Payment $payment): Payment
    {
        return $payment->load([
            'invoice',
            'company',
            'customerUser',
            'recorder',
            'reverser',
            'allocations.invoice',
        ]);
    }
}

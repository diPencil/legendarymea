<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Support\Money;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompanyCreditService
{
    public function __construct(
        private InvoiceSettlementService $invoiceSettlementService,
    ) {}

    /**
     * List all posted payments with available unallocated credit for a company and optional currency.
     */
    public function getAvailableCredits(int $companyId, ?string $currency = null): Collection
    {
        $query = Payment::query()
            ->where('company_id', $companyId)
            ->where('status', PaymentStatus::POSTED)
            ->where('unallocated_amount', '>', 0)
            ->orderBy('paid_at', 'asc')
            ->orderBy('id', 'asc');

        if ($currency) {
            $query->where('currency', strtoupper($currency));
        }

        return $query->get()->map(function (Payment $payment) {
            return [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'company_id' => $payment->company_id,
                'currency' => $payment->currency,
                'amount' => Money::normalize($payment->amount, $payment->currency),
                'allocated_amount' => Money::normalize($payment->allocated_amount, $payment->currency),
                'unallocated_amount' => Money::normalize($payment->unallocated_amount, $payment->currency),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'method' => $payment->method instanceof \BackedEnum ? $payment->method->value : (string) $payment->method,
                'transaction_reference' => $payment->transaction_reference,
                'notes' => $payment->notes,
                'allocations_count' => $payment->allocations()->whereNull('reversed_at')->count(),
            ];
        });
    }

    /**
     * Get aggregated available credit for a company grouped by currency.
     */
    public function getAvailableCreditSummary(int $companyId): array
    {
        $payments = Payment::query()
            ->where('company_id', $companyId)
            ->where('status', PaymentStatus::POSTED)
            ->where('unallocated_amount', '>', 0)
            ->get();

        $byCurrency = [];

        foreach ($payments as $payment) {
            $curr = strtoupper($payment->currency);
            $minor = Money::toMinorUnits($payment->unallocated_amount, $curr);
            $byCurrency[$curr] = ($byCurrency[$curr] ?? 0) + $minor;
        }

        $summary = [];
        foreach ($byCurrency as $curr => $totalMinor) {
            $summary[] = [
                'currency' => $curr,
                'available_credit' => Money::fromMinorUnits($totalMinor, $curr),
            ];
        }

        return $summary;
    }

    /**
     * Apply unallocated company credit from a specific posted payment to one or more outstanding invoices.
     */
    public function applyCredit(Payment $payment, array $data, int $userId): array
    {
        // 1. Check idempotency before entering transaction
        $idempotencyKey = $data['idempotency_key'] ?? null;
        if ($idempotencyKey) {
            $existingAllocations = PaymentAllocation::where('idempotency_key', $idempotencyKey)->get();
            if ($existingAllocations->isNotEmpty()) {
                return $this->resolveIdempotentCreditApplication($existingAllocations, $payment, $data);
            }
        }

        return DB::transaction(function () use ($payment, $data, $userId, $idempotencyKey) {
            // Lock source payment
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            // Claim the key in a dedicated table so retries are serialized even when
            // concurrent requests target different source payments.
            if ($idempotencyKey) {
                $claimed = DB::table('payment_allocation_requests')->insertOrIgnore([
                    'idempotency_key' => $idempotencyKey,
                    'payment_id' => $payment->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($claimed === 0) {
                    $requestPaymentId = DB::table('payment_allocation_requests')
                        ->where('idempotency_key', $idempotencyKey)
                        ->value('payment_id');

                    if ((int) $requestPaymentId !== (int) $payment->id) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => ['This idempotency key has already been used with a different payment receipt.'],
                        ]);
                    }
                }

                $lockedExisting = PaymentAllocation::where('idempotency_key', $idempotencyKey)->get();
                if ($lockedExisting->isNotEmpty()) {
                    return $this->resolveIdempotentCreditApplication($lockedExisting, $payment, $data);
                }
            }

            if ($payment->status !== PaymentStatus::POSTED) {
                throw ValidationException::withMessages([
                    'payment' => ['Only posted payments can provide company credit for invoice allocations.'],
                ]);
            }

            if (!empty($data['company_id']) && (int) $payment->company_id !== (int) $data['company_id']) {
                throw ValidationException::withMessages([
                    'company_id' => ['The selected payment does not belong to the specified company.'],
                ]);
            }

            $currency = $payment->currency;
            $availableCreditMinorUnits = Money::toMinorUnits($payment->unallocated_amount, $currency);

            if ($availableCreditMinorUnits <= 0) {
                throw ValidationException::withMessages([
                    'payment' => ['This payment has no available unallocated credit remaining.'],
                ]);
            }

            $allocationsData = $data['allocations'] ?? [];
            if (empty($allocationsData) || !is_array($allocationsData)) {
                throw ValidationException::withMessages([
                    'allocations' => ['At least one invoice allocation is required.'],
                ]);
            }

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
                        'allocations' => ['Duplicate invoice allocations are not permitted in the same credit application.'],
                    ]);
                }

                $seenInvoiceIds[$invoiceId] = true;
                $invoiceIds[] = $invoiceId;
            }

            // Lock invoices in deterministic order by ID to prevent deadlocks
            sort($invoiceIds);
            $invoices = Invoice::query()
                ->whereIn('id', $invoiceIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $totalCreditToConsumeMinorUnits = 0;
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
                        "allocations.{$index}.invoice_id" => ["Invoice {$invoice->reference} does not belong to the payment's company."],
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

                if (!Money::hasValidPrecision($item['amount'], $currency)) {
                    throw ValidationException::withMessages([
                        "allocations.{$index}.amount" => ["Allocation amount for invoice {$invoice->reference} has invalid precision for currency {$currency}."],
                    ]);
                }

                $allocatedAmount = Money::normalize($item['amount'], $currency);
                $allocatedMinorUnits = Money::toMinorUnits($allocatedAmount, $currency);

                if ($allocatedMinorUnits <= 0) {
                    throw ValidationException::withMessages([
                        "allocations.{$index}.amount" => ['Allocation amount must be greater than zero.'],
                    ]);
                }

                $remainingBalanceMinorUnits = $this->invoiceSettlementService->balanceDueMinorUnits($invoice);

                if ($allocatedMinorUnits > $remainingBalanceMinorUnits) {
                    $maxFormatted = Money::fromMinorUnits($remainingBalanceMinorUnits, $currency);
                    throw ValidationException::withMessages([
                        "allocations.{$index}.amount" => ["Allocation amount for invoice {$invoice->reference} exceeds its balance due ({$maxFormatted})."],
                    ]);
                }

                $totalCreditToConsumeMinorUnits += $allocatedMinorUnits;
                $allocationsToCreate[] = [
                    'invoice' => $invoice,
                    'amount' => $allocatedAmount,
                    'notes' => $item['notes'] ?? ($data['notes'] ?? 'Company credit application'),
                ];
            }

            if ($totalCreditToConsumeMinorUnits > $availableCreditMinorUnits) {
                $requestedFormatted = Money::fromMinorUnits($totalCreditToConsumeMinorUnits, $currency);
                $availableFormatted = Money::fromMinorUnits($availableCreditMinorUnits, $currency);
                throw ValidationException::withMessages([
                    'allocations' => ["Total credit allocation ({$requestedFormatted}) exceeds available unallocated credit ({$availableFormatted})."],
                ]);
            }

            // Create allocations
            $createdAllocations = [];
            foreach ($allocationsToCreate as $alloc) {
                $createdAllocations[] = PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $alloc['invoice']->id,
                    'amount' => $alloc['amount'],
                    'notes' => $alloc['notes'],
                    'applied_by' => $userId,
                    'idempotency_key' => $idempotencyKey,
                    'reversed_at' => null,
                ]);
            }

            // Update payment allocated and unallocated balances
            $oldUnallocated = $payment->unallocated_amount;
            $newAllocatedMinorUnits = Money::toMinorUnits($payment->allocated_amount, $currency) + $totalCreditToConsumeMinorUnits;
            $newUnallocatedMinorUnits = $availableCreditMinorUnits - $totalCreditToConsumeMinorUnits;

            $payment->update([
                'allocated_amount' => Money::fromMinorUnits($newAllocatedMinorUnits, $currency),
                'unallocated_amount' => Money::fromMinorUnits($newUnallocatedMinorUnits, $currency),
                'paid_at' => $payment->paid_at,
            ]);

            // Recalculate target invoices
            foreach ($invoices as $invoice) {
                $this->invoiceSettlementService->recalculate($invoice);
            }

            // Record system activity
            SystemActivityService::record(
                actor: auth()->user(),
                action: 'applied_company_credit',
                module: 'Payment',
                entity: $payment,
                oldValues: ['unallocated_amount' => $oldUnallocated],
                newValues: ['unallocated_amount' => $payment->unallocated_amount],
                metadata: [
                    'payment_reference' => $payment->reference,
                    'company_id' => $payment->company_id,
                    'applied_credit_amount' => Money::fromMinorUnits($totalCreditToConsumeMinorUnits, $currency),
                    'allocations_count' => count($createdAllocations),
                    'invoice_references' => $invoices->pluck('reference')->implode(', '),
                ]
            );

            return [
                'payment' => $payment->fresh(['company', 'allocations.invoice']),
                'allocations' => $createdAllocations,
            ];
        }, 3);
    }

    /**
     * Safely reverse an individual credit allocation without reversing the parent payment receipt.
     */
    public function reverseCreditAllocation(PaymentAllocation $allocation, string $reason, int $userId): PaymentAllocation
    {
        return DB::transaction(function () use ($allocation, $reason, $userId) {
            $allocation = PaymentAllocation::query()->whereKey($allocation->id)->lockForUpdate()->firstOrFail();

            if ($allocation->reversed_at !== null) {
                throw ValidationException::withMessages([
                    'allocation' => ['This allocation has already been reversed.'],
                ]);
            }

            $payment = Payment::query()->whereKey($allocation->payment_id)->lockForUpdate()->firstOrFail();

            if ($payment->status === PaymentStatus::REVERSED) {
                throw ValidationException::withMessages([
                    'allocation' => ['The parent payment receipt is already reversed.'],
                ]);
            }

            $invoice = Invoice::query()->whereKey($allocation->invoice_id)->lockForUpdate()->firstOrFail();

            // Mark allocation reversed with audit details
            $allocation->update([
                'reversed_at' => now(),
                'reversed_by' => $userId,
                'reversal_reason' => $reason,
            ]);

            // Restore credit to parent payment
            $currency = $payment->currency;
            $allocMinorUnits = Money::toMinorUnits($allocation->amount, $currency);
            $newAllocatedMinorUnits = max(0, Money::toMinorUnits($payment->allocated_amount, $currency) - $allocMinorUnits);
            $newUnallocatedMinorUnits = Money::toMinorUnits($payment->unallocated_amount, $currency) + $allocMinorUnits;

            $payment->update([
                'allocated_amount' => Money::fromMinorUnits($newAllocatedMinorUnits, $currency),
                'unallocated_amount' => Money::fromMinorUnits($newUnallocatedMinorUnits, $currency),
                'paid_at' => $payment->paid_at,
            ]);

            // Recalculate affected invoice
            $this->invoiceSettlementService->recalculate($invoice);

            // Record audit activity
            SystemActivityService::record(
                actor: auth()->user(),
                action: 'reversed_credit_allocation',
                module: 'PaymentAllocation',
                entity: $allocation,
                oldValues: ['reversed_at' => null],
                newValues: ['reversed_at' => $allocation->reversed_at->toIso8601String()],
                metadata: [
                    'payment_reference' => $payment->reference,
                    'invoice_reference' => $invoice->reference,
                    'restored_credit_amount' => $allocation->amount,
                    'currency' => $currency,
                    'reversal_reason' => $reason,
                ]
            );

            return $allocation->fresh(['payment', 'invoice', 'applier', 'reverser']);
        }, 3);
    }

    private function resolveIdempotentCreditApplication(Collection $existingAllocations, Payment $payment, array $data): array
    {
        if ((int) $existingAllocations->first()?->payment_id !== (int) $payment->id) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['This idempotency key has already been used with a different payment receipt.'],
            ]);
        }

        $requestedAllocations = $data['allocations'] ?? [];
        $currency = $payment->currency;

        if (count($existingAllocations) !== count($requestedAllocations)) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['This idempotency key has already been used with a different credit application payload.'],
            ]);
        }

        $existingByInvoice = $existingAllocations->keyBy('invoice_id');

        foreach ($requestedAllocations as $req) {
            $invoiceId = (int) ($req['invoice_id'] ?? 0);
            $existing = $existingByInvoice->get($invoiceId);

            if (!$existing) {
                throw ValidationException::withMessages([
                    'idempotency_key' => ['This idempotency key has already been used with a different credit application payload.'],
                ]);
            }

            $reqAmount = Money::normalize($req['amount'], $currency);
            if (Money::compare($existing->amount, $reqAmount) !== 0) {
                throw ValidationException::withMessages([
                    'idempotency_key' => ['This idempotency key has already been used with a different credit application payload.'],
                ]);
            }
        }

        return [
            'payment' => $payment->fresh(['company', 'allocations.invoice']),
            'allocations' => $existingAllocations,
        ];
    }
}

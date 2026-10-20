<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReversePaymentService
{
    public function __construct(
        private InvoiceSettlementService $invoiceSettlementService,
    ) {}

    public function execute(Payment $payment, string $reason, int $userId): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $userId) {
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== PaymentStatus::POSTED) {
                throw ValidationException::withMessages([
                    'status' => ['Only posted payments can be reversed.'],
                ]);
            }

            $allocatedInvoiceIds = $payment->allocations()->pluck('invoice_id')->all();
            if ($payment->invoice_id) {
                $allocatedInvoiceIds[] = $payment->invoice_id;
            }
            $uniqueInvoiceIds = array_values(array_unique(array_filter($allocatedInvoiceIds)));

            $invoices = Invoice::query()
                ->whereIn('id', $uniqueInvoiceIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $payment->update([
                'status' => PaymentStatus::REVERSED,
                'reversed_at' => now(),
                'reversed_by' => $userId,
                'reversal_reason' => $reason,
            ]);

            $payment->allocations()->whereNull('reversed_at')->update([
                'reversed_at' => now(),
                'reversed_by' => $userId,
                'reversal_reason' => $reason,
            ]);

            foreach ($invoices as $invoice) {
                $this->invoiceSettlementService->recalculate($invoice);
            }

            $invoiceReferences = $invoices->pluck('reference')->implode(', ');

            SystemActivityService::record(
                actor: auth()->user(),
                action: 'reversed',
                module: 'Payment',
                entity: $payment,
                oldValues: ['status' => PaymentStatus::POSTED->value],
                newValues: ['status' => PaymentStatus::REVERSED->value],
                metadata: [
                    'payment_reference' => $payment->reference,
                    'invoice_references' => $invoiceReferences,
                    'company_id' => $payment->company_id,
                    'amount' => $payment->amount,
                ]
            );

            return $payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser', 'allocations.invoice']);
        }, 3);
    }
}

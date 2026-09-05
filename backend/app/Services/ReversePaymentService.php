<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\PaymentStatus;
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
        if ($payment->status !== PaymentStatus::POSTED) {
            throw ValidationException::withMessages([
                'status' => ['Only posted payments can be reversed.'],
            ]);
        }

        return DB::transaction(function () use ($payment, $reason, $userId) {
            $payment->update([
                'status' => PaymentStatus::REVERSED,
                'reversed_at' => now(),
                'reversed_by' => $userId,
                'reversal_reason' => $reason,
            ]);

            $this->invoiceSettlementService->recalculate($payment->invoice()->firstOrFail());

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'reversed',
            module: 'Payment',
            entity: $payment,
            oldValues: ['status' => PaymentStatus::POSTED->value],
            newValues: [],
            metadata: [
                            'payment_reference' => $payment->reference,
                            'invoice_reference' => $payment->invoice->reference,
                        ]
        );

            return $payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser']);
        });
    }
}

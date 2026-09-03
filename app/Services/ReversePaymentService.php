<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
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

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'payment.reversed',
                'subject_type' => Payment::class,
                'subject_id' => $payment->id,
                'old_values' => ['status' => PaymentStatus::POSTED->value],
                'new_values' => [
                    'status' => PaymentStatus::REVERSED->value,
                    'reversal_reason' => $reason,
                ],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'payment.reversed',
                'subject_type' => Payment::class,
                'subject_id' => $payment->id,
                'company_id' => $payment->company_id,
                'metadata' => [
                    'payment_reference' => $payment->reference,
                    'invoice_reference' => $payment->invoice->reference,
                ],
            ]);

            return $payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser']);
        });
    }
}

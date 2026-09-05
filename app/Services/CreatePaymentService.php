<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePaymentService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
        private InvoiceSettlementService $invoiceSettlementService,
    ) {}

    public function execute(array $data, int $userId): Payment
    {
        $invoice = Invoice::with(['company', 'customerUser'])->findOrFail($data['invoice_id']);

        $this->validateInvoice($invoice, $data['amount']);

        return DB::transaction(function () use ($data, $invoice, $userId) {
            $payment = Payment::create([
                'reference' => $this->referenceGenerator->generate(
                    'LM-PAY-' . date('Y') . '-',
                    'payments',
                    'reference',
                    6
                ),
                'invoice_id' => $invoice->id,
                'customer_type' => $invoice->customer_type,
                'company_id' => $invoice->company_id,
                'customer_user_id' => $invoice->customer_user_id,
                'status' => PaymentStatus::POSTED,
                'amount' => number_format((float) $data['amount'], 2, '.', ''),
                'currency' => $invoice->currency,
                'method' => $data['method'],
                'transaction_reference' => $data['transaction_reference'] ?? null,
                'paid_at' => $data['paid_at'],
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $userId,
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

            return $payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser']);
        });
    }

    private function validateInvoice(Invoice $invoice, mixed $amount): void
    {
        if (!in_array($invoice->status, [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID, InvoiceStatus::OVERDUE], true)) {
            throw ValidationException::withMessages([
                'invoice_id' => ['Payments may only be recorded against issued, partially paid, or overdue invoices.'],
            ]);
        }

        $remainingCents = $this->invoiceSettlementService->balanceDueCents($invoice);
        $amountCents = (int) round(((float) $amount) * 100);

        if ($amountCents <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Payment amount must be greater than zero.'],
            ]);
        }

        if ($amountCents > $remainingCents) {
            throw ValidationException::withMessages([
                'amount' => ['Payment amount exceeds the remaining invoice balance.'],
            ]);
        }
    }
}

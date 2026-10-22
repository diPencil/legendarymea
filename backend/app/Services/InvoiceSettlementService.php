<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Support\Money;

class InvoiceSettlementService
{
    public function recalculate(Invoice $invoice): Invoice
    {
        if (in_array($invoice->status, [InvoiceStatus::DRAFT, InvoiceStatus::CANCELLED], true)) {
            return $invoice;
        }

        $postedTotalMinorUnits = $this->postedPaymentsTotalMinorUnits($invoice);
        $invoiceTotalMinorUnits = Money::toMinorUnits($invoice->total_amount, $invoice->currency);
        $isPastDue = $invoice->due_date?->lt(today()) ?? false;

        if ($postedTotalMinorUnits >= $invoiceTotalMinorUnits) {
            $status = InvoiceStatus::PAID;
        } elseif ($postedTotalMinorUnits > 0 && $isPastDue) {
            $status = InvoiceStatus::OVERDUE;
        } elseif ($postedTotalMinorUnits > 0) {
            $status = InvoiceStatus::PARTIALLY_PAID;
        } elseif ($isPastDue) {
            $status = InvoiceStatus::OVERDUE;
        } else {
            $status = InvoiceStatus::ISSUED;
        }

        if ($invoice->status !== $status) {
            $invoice->update(['status' => $status]);
        }

        return $invoice->refresh();
    }

    public function postedPaymentsTotalMinorUnits(Invoice $invoice): int
    {
        if (Invoice::paymentAllocationsAvailable() && $invoice->allocations()->exists()) {
            return $invoice->allocations()
                ->whereNull('reversed_at')
                ->whereHas('payment', fn ($q) => $q->where('status', 'posted'))
                ->pluck('amount')
                ->reduce(
                    fn (int $total, mixed $amount) => $total + Money::toMinorUnits($amount, $invoice->currency),
                    0
                );
        }

        return $invoice->payments()
            ->where('status', 'posted')
            ->pluck('amount')
            ->reduce(
                fn (int $total, mixed $amount) => $total + Money::toMinorUnits($amount, $invoice->currency),
                0
            );
    }

    public function balanceDueMinorUnits(Invoice $invoice): int
    {
        return max(0, Money::toMinorUnits($invoice->total_amount, $invoice->currency) - $this->postedPaymentsTotalMinorUnits($invoice));
    }
}

<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

class InvoiceSettlementService
{
    public function recalculate(Invoice $invoice): Invoice
    {
        if (in_array($invoice->status, [InvoiceStatus::DRAFT, InvoiceStatus::CANCELLED], true)) {
            return $invoice;
        }

        $postedTotalCents = $this->postedPaymentsTotalCents($invoice);
        $invoiceTotalCents = $this->decimalToCents((string) $invoice->total_amount);
        $isPastDue = $invoice->due_date?->isPast() ?? false;

        if ($postedTotalCents >= $invoiceTotalCents) {
            $status = InvoiceStatus::PAID;
        } elseif ($postedTotalCents > 0 && $isPastDue) {
            $status = InvoiceStatus::OVERDUE;
        } elseif ($postedTotalCents > 0) {
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

    public function postedPaymentsTotalCents(Invoice $invoice): int
    {
        return (int) $invoice->payments()
            ->where('status', 'posted')
            ->sum(DB::raw('ROUND(amount * 100)'));
    }

    public function balanceDueCents(Invoice $invoice): int
    {
        return max(0, $this->decimalToCents((string) $invoice->total_amount) - $this->postedPaymentsTotalCents($invoice));
    }

    private function decimalToCents(string $value): int
    {
        return (int) round(((float) $value) * 100);
    }
}

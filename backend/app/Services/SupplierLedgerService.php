<?php

namespace App\Services;

use App\Enums\SupplierLedgerDirection;
use App\Enums\SupplierLedgerType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\SupplierLedgerEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierLedgerService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
    ) {}

    public function fundBalance(Supplier $supplier, array $data, int $userId): SupplierLedgerEntry
    {
        return DB::transaction(function () use ($supplier, $data, $userId) {
            $account = $this->lockedAccount($supplier->id, $data['currency']);

            $amount = number_format((float) $data['amount'], 2, '.', '');
            $before = (float) $account->current_balance;
            $after = $before + (float) $amount;

            $account->update([
                'current_balance' => number_format($after, 2, '.', ''),
            ]);

            $entry = SupplierLedgerEntry::create([
                'reference' => $this->referenceGenerator->generate('LM-SUPLED-' . date('Y') . '-', 'supplier_ledger_entries', 'reference', 6),
                'supplier_id' => $supplier->id,
                'supplier_balance_account_id' => $account->id,
                'currency' => $account->currency,
                'type' => SupplierLedgerType::FUNDING,
                'direction' => SupplierLedgerDirection::CREDIT,
                'amount' => $amount,
                'balance_before' => number_format($before, 2, '.', ''),
                'balance_after' => number_format($after, 2, '.', ''),
                'transaction_date' => $data['transaction_date'],
                'payment_method' => $data['payment_method'] ?? null,
                'external_reference' => $data['external_reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            SystemActivityService::record(
                actor: auth()->user(),
                action: 'balance_funded',
                module: 'Supplier',
                entity: $supplier,
                oldValues: ['balance' => number_format($before, 2, '.', '')],
                newValues: ['balance' => number_format($after, 2, '.', '')],
                metadata: [
                    'supplier_reference' => $supplier->reference,
                    'currency' => $account->currency,
                    'amount' => $amount,
                    'ledger_reference' => $entry->reference,
                    'actor_id' => $userId,
                ]
            );

            return $entry->load(['invoice']);
        });
    }

    public function adjustBalance(Supplier $supplier, array $data, int $userId): SupplierLedgerEntry
    {
        return DB::transaction(function () use ($supplier, $data, $userId) {
            $account = $this->lockedAccount($supplier->id, $data['currency']);
            $signedAmount = round((float) $data['amount'], 2);
            if (abs($signedAmount) < 0.01) {
                throw ValidationException::withMessages([
                    'amount' => ['Adjustment amount must be at least 0.01 or at most -0.01.'],
                ]);
            }
            $absoluteAmount = number_format(abs($signedAmount), 2, '.', '');
            $before = (float) $account->current_balance;
            $after = $before + $signedAmount;

            $account->update(['current_balance' => number_format($after, 2, '.', '')]);

            $entry = SupplierLedgerEntry::create([
                'reference' => $this->ledgerReference(),
                'supplier_id' => $supplier->id,
                'supplier_balance_account_id' => $account->id,
                'currency' => $account->currency,
                'type' => SupplierLedgerType::ADJUSTMENT,
                'direction' => $signedAmount > 0 ? SupplierLedgerDirection::CREDIT : SupplierLedgerDirection::DEBIT,
                'amount' => $absoluteAmount,
                'balance_before' => number_format($before, 2, '.', ''),
                'balance_after' => number_format($after, 2, '.', ''),
                'transaction_date' => $data['transaction_date'] ?? now()->toDateString(),
                'notes' => $data['reason'],
                'created_by' => $userId,
            ]);

            SystemActivityService::record(
                actor: auth()->user(),
                action: 'balance_adjusted',
                module: 'Supplier',
                entity: $supplier,
                oldValues: ['balance' => number_format($before, 2, '.', '')],
                newValues: ['balance' => number_format($after, 2, '.', '')],
                metadata: [
                    'supplier_reference' => $supplier->reference,
                    'currency' => $account->currency,
                    'amount' => number_format($signedAmount, 2, '.', ''),
                    'ledger_reference' => $entry->reference,
                    'reason' => $data['reason'],
                    'actor_id' => $userId,
                ]
            );

            return $entry->load(['invoice']);
        });
    }

    public function consumeForInvoice(Invoice $invoice, int $userId): void
    {
        $invoice->loadMissing(['items.supplier', 'items']);

        foreach ($invoice->items as $item) {
            $this->consumeInvoiceItem($invoice, $item, $userId);
        }
    }

    public function reverseForInvoice(Invoice $invoice, int $userId, string $reason = 'Invoice supplier usage correction'): void
    {
        $entries = SupplierLedgerEntry::query()
            ->where('invoice_id', $invoice->id)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->whereDoesntHave('reversals')
            ->orderBy('id')
            ->get();

        foreach ($entries as $entry) {
            $account = SupplierBalanceAccount::query()->whereKey($entry->supplier_balance_account_id)->lockForUpdate()->firstOrFail();
            $before = (float) $account->current_balance;
            $after = $before + (float) $entry->amount;

            $account->update(['current_balance' => number_format($after, 2, '.', '')]);

            $reversal = SupplierLedgerEntry::create([
                'reference' => $this->ledgerReference(),
                'supplier_id' => $entry->supplier_id,
                'supplier_balance_account_id' => $account->id,
                'currency' => $entry->currency,
                'type' => SupplierLedgerType::REVERSAL,
                'direction' => SupplierLedgerDirection::CREDIT,
                'amount' => $entry->amount,
                'balance_before' => number_format($before, 2, '.', ''),
                'balance_after' => number_format($after, 2, '.', ''),
                'invoice_id' => $invoice->id,
                'invoice_item_id' => $entry->invoice_item_id,
                'transaction_date' => now()->toDateString(),
                'notes' => $reason,
                'created_by' => $userId,
                'reversal_of_id' => $entry->id,
            ]);

            SystemActivityService::record(
                actor: auth()->user(),
                action: 'invoice_usage_reversed',
                module: 'Supplier',
                entity: $entry->supplier,
                oldValues: ['balance' => number_format($before, 2, '.', '')],
                newValues: ['balance' => number_format($after, 2, '.', '')],
                metadata: [
                    'supplier_id' => $entry->supplier_id,
                    'currency' => $entry->currency,
                    'amount' => $entry->amount,
                    'invoice_reference' => $invoice->reference,
                    'ledger_reference' => $reversal->reference,
                    'reversal_of' => $entry->reference,
                    'actor_id' => $userId,
                ]
            );
        }
    }

    private function consumeInvoiceItem(Invoice $invoice, InvoiceItem $item, int $userId): void
    {
        if (!$item->supplier_id || !$item->purchase_currency) {
            return;
        }

        if (SupplierLedgerEntry::query()
            ->where('invoice_id', $invoice->id)
            ->where('invoice_item_id', $item->id)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->exists()) {
            return;
        }

        $account = $this->lockedAccount($item->supplier_id, $item->purchase_currency);

        $amount = (float) $item->purchase_unit_cost * (float) $item->quantity;
        $before = (float) $account->current_balance;
        $after = $before - $amount;

        $account->update([
            'current_balance' => number_format($after, 2, '.', ''),
        ]);

        SupplierLedgerEntry::create([
            'reference' => $this->ledgerReference(),
            'supplier_id' => $item->supplier_id,
            'supplier_balance_account_id' => $account->id,
            'currency' => $account->currency,
            'type' => SupplierLedgerType::INVOICE_USAGE,
            'direction' => SupplierLedgerDirection::DEBIT,
            'amount' => number_format($amount, 2, '.', ''),
            'balance_before' => number_format($before, 2, '.', ''),
            'balance_after' => number_format($after, 2, '.', ''),
            'invoice_id' => $invoice->id,
            'invoice_item_id' => $item->id,
            'transaction_date' => $invoice->issue_date ?? now()->toDateString(),
            'notes' => 'Invoice issue cost allocation',
            'created_by' => $userId,
        ]);

        $supplier = $item->supplier;
        SystemActivityService::record(
            actor: auth()->user(),
            action: 'invoice_usage_recorded',
            module: 'Supplier',
            entity: $supplier,
            oldValues: ['balance' => number_format($before, 2, '.', '')],
            newValues: ['balance' => number_format($after, 2, '.', '')],
            metadata: [
                'supplier_id' => $item->supplier_id,
                'currency' => $account->currency,
                'amount' => number_format($amount, 2, '.', ''),
                'invoice_reference' => $invoice->reference,
                'invoice_item_id' => $item->id,
                'actor_id' => $userId,
            ]
        );
    }

    private function lockedAccount(int $supplierId, string $currency): SupplierBalanceAccount
    {
        $normalizedCurrency = strtoupper($currency);
        $account = SupplierBalanceAccount::query()
            ->where('supplier_id', $supplierId)
            ->where('currency', $normalizedCurrency)
            ->lockForUpdate()
            ->first();

        if ($account) {
            return $account;
        }

        $account = SupplierBalanceAccount::firstOrCreate([
            'supplier_id' => $supplierId,
            'currency' => $normalizedCurrency,
        ], [
            'current_balance' => '0.00',
        ]);

        return SupplierBalanceAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
    }

    private function ledgerReference(): string
    {
        return $this->referenceGenerator->generate(
            'LM-SUPLED-' . date('Y') . '-',
            'supplier_ledger_entries',
            'reference',
            6
        );
    }
}

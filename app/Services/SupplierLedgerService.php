<?php

namespace App\Services;

use App\Services\SystemActivityService;

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
            $account = SupplierBalanceAccount::query()
                ->where('supplier_id', $supplier->id)
                ->where('currency', strtoupper($data['currency']))
                ->lockForUpdate()
                ->first();

            if (!$account) {
                $account = SupplierBalanceAccount::create([
                    'supplier_id' => $supplier->id,
                    'currency' => strtoupper($data['currency']),
                    'current_balance' => '0.00',
                ]);
                $account->refresh();
            }

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
            oldValues: [],
            newValues: [],
            metadata: []
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

        $account = SupplierBalanceAccount::query()
            ->where('supplier_id', $item->supplier_id)
            ->where('currency', strtoupper($item->purchase_currency))
            ->lockForUpdate()
            ->first();

        if (!$account) {
            throw ValidationException::withMessages([
                'items' => ['Insufficient supplier balance.'],
            ]);
        }

        $amount = (float) $item->purchase_unit_cost * (float) $item->quantity;
        $before = (float) $account->current_balance;
        $after = $before - $amount;

        if ($after < -0.0001) {
            throw ValidationException::withMessages([
                'items' => ['Insufficient supplier balance.'],
            ]);
        }

        $account->update([
            'current_balance' => number_format($after, 2, '.', ''),
        ]);

        SupplierLedgerEntry::create([
            'reference' => $this->referenceGenerator->generate('LM-SUPLED-' . date('Y') . '-', 'supplier_ledger_entries', 'reference', 6),
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

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'balance_used',
            module: 'Supplier',
            entity: null,
            oldValues: [],
            newValues: [],
            metadata: []
        );
    }
}

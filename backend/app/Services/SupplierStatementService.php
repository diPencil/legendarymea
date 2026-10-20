<?php

namespace App\Services;

use App\Enums\SupplierLedgerDirection;
use App\Enums\SupplierLedgerType;
use App\Models\InvoiceItem;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\SupplierLedgerEntry;
use App\Support\Decimal;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class SupplierStatementService
{
    /**
     * Get all distinct currencies used by this supplier across balance accounts, ledger entries, and invoice items.
     *
     * @return string[]
     */
    public function getAvailableCurrencies(Supplier $supplier): array
    {
        $accountCurrencies = SupplierBalanceAccount::query()
            ->where('supplier_id', $supplier->id)
            ->whereNotNull('currency')
            ->distinct()
            ->pluck('currency')
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter();

        $ledgerCurrencies = SupplierLedgerEntry::query()
            ->where('supplier_id', $supplier->id)
            ->whereNotNull('currency')
            ->distinct()
            ->pluck('currency')
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter();

        $itemCurrencies = InvoiceItem::query()
            ->where('supplier_id', $supplier->id)
            ->whereNotNull('purchase_currency')
            ->distinct()
            ->pluck('purchase_currency')
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter();

        $allCurrencies = $accountCurrencies
            ->merge($ledgerCurrencies)
            ->merge($itemCurrencies)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return !empty($allCurrencies) ? $allCurrencies : ['AED'];
    }

    /**
     * Generate the complete supplier account statement with full chronological running balances and reconciliation.
     *
     * @param Supplier $supplier
     * @param array{
     *     currency?: string,
     *     start_date?: string,
     *     end_date?: string,
     *     type?: string,
     *     page?: int,
     *     per_page?: int,
     *     all?: bool,
     * } $filters
     * @return array
     */
    public function getStatement(Supplier $supplier, array $filters = []): array
    {
        // 1. Resolve Currency
        $availableCurrencies = $this->getAvailableCurrencies($supplier);
        $currency = strtoupper(trim((string) ($filters['currency'] ?? '')));
        if (!$currency) {
            $currency = $availableCurrencies[0] ?? 'AED';
        }

        // 2. Resolve Date Boundaries (inclusive)
        $now = Carbon::now('UTC');
        $asOfDate = $now->toIso8601String();

        $startDateStr = $filters['start_date'] ?? null;
        $endDateStr = $filters['end_date'] ?? null;

        $startDate = $startDateStr
            ? Carbon::parse($startDateStr, 'UTC')->startOfDay()
            : Carbon::createFromDate($now->year, 1, 1, 'UTC')->startOfDay();

        $endDate = $endDateStr
            ? Carbon::parse($endDateStr, 'UTC')->endOfDay()
            : $now->copy()->endOfDay();

        if ($startDate->isAfter($endDate)) {
            throw ValidationException::withMessages([
                'start_date' => ['The start date must not be after the end date.'],
            ]);
        }

        // 3. Compile Master Chronological Ledger Entries up to endDate
        $entries = $this->compileLedgerEntries($supplier, $currency, $endDate);

        // 4. Partition into Opening (before startDate) vs Period (between startDate and endDate)
        $openingEntries = [];
        $periodEntries = [];

        $startDateFormatted = $startDate->toDateString();
        foreach ($entries as $entry) {
            $entryDate = $entry->transaction_date ? $entry->transaction_date->toDateString() : $entry->created_at->toDateString();
            if ($entryDate < $startDateFormatted) {
                $openingEntries[] = $entry;
            } else {
                $periodEntries[] = $entry;
            }
        }

        // 5. Calculate Opening Balance from Opening Entries
        $openingBalanceMinor = 0;
        foreach ($openingEntries as $entry) {
            $amountMinor = Money::toMinorUnits($entry->amount, $currency);
            if ($entry->direction === SupplierLedgerDirection::CREDIT) {
                $openingBalanceMinor += $amountMinor;
            } else {
                $openingBalanceMinor -= $amountMinor;
            }
        }

        $openingBalance = Money::fromMinorUnits($openingBalanceMinor, $currency);
        $openingAvailable = $openingBalanceMinor > 0 ? $openingBalance : Money::normalize(0, $currency);
        $openingOwed = $openingBalanceMinor < 0
            ? Decimal::absolute($openingBalance, Money::precision($currency))
            : Money::normalize(0, $currency);

        // 6. Calculate Running Balances and Ledger Lines for Period Entries
        $runningBalanceMinor = $openingBalanceMinor;
        $periodLines = [];

        $periodFundingMinor = 0;
        $periodUsageMinor = 0;
        $periodAdjustmentsCreditMinor = 0;
        $periodAdjustmentsDebitMinor = 0;
        $periodReversalsMinor = 0;

        foreach ($periodEntries as $entry) {
            $amountMinor = Money::toMinorUnits($entry->amount, $currency);
            $normalizedAmount = Money::normalize($entry->amount, $currency);

            if ($entry->direction === SupplierLedgerDirection::CREDIT) {
                $deltaMinor = $amountMinor;
                $debit = null;
                $credit = $normalizedAmount;
            } else {
                $deltaMinor = -$amountMinor;
                $debit = $normalizedAmount;
                $credit = null;
            }

            $runningBalanceMinor += $deltaMinor;

            // Accumulate period movement metrics
            if ($entry->type === SupplierLedgerType::FUNDING) {
                $periodFundingMinor += $amountMinor;
            } elseif ($entry->type === SupplierLedgerType::INVOICE_USAGE) {
                $periodUsageMinor += $amountMinor;
            } elseif ($entry->type === SupplierLedgerType::ADJUSTMENT) {
                if ($entry->direction === SupplierLedgerDirection::CREDIT) {
                    $periodAdjustmentsCreditMinor += $amountMinor;
                } else {
                    $periodAdjustmentsDebitMinor += $amountMinor;
                }
            } elseif ($entry->type === SupplierLedgerType::REVERSAL) {
                $periodReversalsMinor += $amountMinor;
            }

            // Descriptive details
            $typeLabel = match ($entry->type) {
                SupplierLedgerType::FUNDING => 'Supplier Funding',
                SupplierLedgerType::INVOICE_USAGE => 'Invoice Service Usage',
                SupplierLedgerType::ADJUSTMENT => 'Balance Adjustment',
                SupplierLedgerType::REVERSAL => 'Usage Reversal',
                default => ucfirst(str_replace('_', ' ', $entry->type->value ?? 'transaction')),
            };

            $description = match ($entry->type) {
                SupplierLedgerType::FUNDING => 'Supplier Deposit Funding' . ($entry->external_reference ? " ({$entry->external_reference})" : ''),
                SupplierLedgerType::INVOICE_USAGE => ($entry->invoiceItem?->description ?: $entry->invoiceItem?->service_name_snapshot ?: 'Invoice cost allocation') . ($entry->invoice?->reference ? " - {$entry->invoice->reference}" : ''),
                SupplierLedgerType::ADJUSTMENT => ($entry->notes ?: 'Balance Adjustment'),
                SupplierLedgerType::REVERSAL => 'Reversal of ' . ($entry->reversalOf?->reference ?: 'prior usage') . ($entry->notes ? " - {$entry->notes}" : ''),
                default => $entry->notes ?: 'Supplier transaction',
            };

            $bookingReference = $entry->invoiceItem?->booking_reference ?? null;
            $isReversed = $entry->reversals->isNotEmpty();
            $reversalReference = $entry->reversals->first()?->reference ?? null;

            $line = [
                'id' => $entry->id,
                'reference' => $entry->reference,
                'date' => $entry->transaction_date ? $entry->transaction_date->toDateString() : $entry->created_at->toDateString(),
                'created_at' => $entry->created_at?->toIso8601String(),
                'type' => $entry->type->value,
                'type_label' => $typeLabel,
                'direction' => $entry->direction->value,
                'debit' => $debit,
                'credit' => $credit,
                'amount' => $normalizedAmount,
                'net_effect' => Money::fromMinorUnits($deltaMinor, $currency),
                'running_balance' => Money::fromMinorUnits($runningBalanceMinor, $currency),
                'balance_before' => Money::normalize($entry->balance_before, $currency),
                'balance_after' => Money::normalize($entry->balance_after, $currency),
                'payment_method' => $entry->payment_method?->value,
                'external_reference' => $entry->external_reference,
                'invoice_id' => $entry->invoice_id,
                'invoice_reference' => $entry->invoice?->reference,
                'invoice_item_id' => $entry->invoice_item_id,
                'booking_reference' => $bookingReference,
                'description' => $description,
                'notes' => $entry->notes,
                'reversal_of_id' => $entry->reversal_of_id,
                'reversal_of_reference' => $entry->reversalOf?->reference,
                'is_reversed' => $isReversed,
                'reversal_reference' => $reversalReference,
                'created_by_name' => $entry->creator?->name,
            ];

            $periodLines[] = $line;
        }

        // 7. Calculate Closing Balances and Net Movement
        $periodNetAdjustmentsMinor = $periodAdjustmentsCreditMinor - $periodAdjustmentsDebitMinor;
        $periodNetMovementMinor = $periodFundingMinor + $periodNetAdjustmentsMinor - $periodUsageMinor + $periodReversalsMinor;
        $expectedClosingBalanceMinor = $openingBalanceMinor + $periodNetMovementMinor;

        $closingBalance = Money::fromMinorUnits($runningBalanceMinor, $currency);
        $closingAvailable = $runningBalanceMinor > 0 ? $closingBalance : Money::normalize(0, $currency);
        $closingOwed = $runningBalanceMinor < 0
            ? Decimal::absolute($closingBalance, Money::precision($currency))
            : Money::normalize(0, $currency);

        $positionStatus = match (true) {
            $runningBalanceMinor > 0 => 'in_funds',
            $runningBalanceMinor < 0 => 'owing',
            default => 'settled',
        };

        // 8. Reconciliation with Stored Account & All-Time Ledger
        $reconciliation = $this->reconcileWithStoredAccount($supplier, $currency, $runningBalanceMinor, $endDate);

        // 9. Supporting Schedules (Funding & Invoice Usage)
        $supportingSchedules = $this->buildSupportingSchedules($periodEntries, $currency);

        // 10. Filter Transaction Lines (if requested) & Paginate
        $filteredLines = $periodLines;
        $typeFilter = strtolower(trim((string) ($filters['type'] ?? 'all')));
        if ($typeFilter && $typeFilter !== 'all') {
            $filteredLines = array_values(array_filter($filteredLines, function ($l) use ($typeFilter) {
                return match ($typeFilter) {
                    'funding', 'deposits' => $l['type'] === SupplierLedgerType::FUNDING->value,
                    'usage', 'invoice_usage' => $l['type'] === SupplierLedgerType::INVOICE_USAGE->value,
                    'adjustments' => $l['type'] === SupplierLedgerType::ADJUSTMENT->value,
                    'reversals' => $l['type'] === SupplierLedgerType::REVERSAL->value,
                    default => true,
                };
            }));
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $all = !empty($filters['all']) || ($filters['per_page'] ?? null) === 'all';
        $totalLines = count($filteredLines);

        if ($all) {
            $perPage = max(1, $totalLines);
            $lastPage = 1;
            $paginatedData = $filteredLines;
        } else {
            $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 25)));
            $lastPage = max(1, (int) ceil($totalLines / $perPage));
            $offset = ($page - 1) * $perPage;
            $paginatedData = array_slice($filteredLines, $offset, $perPage);
        }

        return [
            'supplier' => [
                'id' => $supplier->id,
                'reference' => $supplier->reference,
                'name' => $supplier->name,
                'type' => $supplier->type?->value ?? (string) $supplier->type,
                'status' => $supplier->status?->value ?? (string) $supplier->status,
                'email' => $supplier->email,
                'mobile' => $supplier->mobile,
                'address' => $supplier->address,
                'linked_company_id' => $supplier->linked_company_id,
                'linked_user_id' => $supplier->linked_user_id,
            ],
            'currency' => $currency,
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'as_of_date' => $asOfDate,
                'timezone' => 'UTC',
            ],
            'summary' => [
                'opening_balance' => [
                    'balance' => $openingBalance,
                    'available_funds' => $openingAvailable,
                    'amount_owed' => $openingOwed,
                ],
                'period_movements' => [
                    'funding_total' => Money::fromMinorUnits($periodFundingMinor, $currency),
                    'usage_total' => Money::fromMinorUnits($periodUsageMinor, $currency),
                    'adjustments_credit' => Money::fromMinorUnits($periodAdjustmentsCreditMinor, $currency),
                    'adjustments_debit' => Money::fromMinorUnits($periodAdjustmentsDebitMinor, $currency),
                    'net_adjustments' => Money::fromMinorUnits($periodNetAdjustmentsMinor, $currency),
                    'reversals_total' => Money::fromMinorUnits($periodReversalsMinor, $currency),
                    'net_movement' => Money::fromMinorUnits($periodNetMovementMinor, $currency),
                ],
                'closing_balance' => [
                    'balance' => $closingBalance,
                    'available_funds' => $closingAvailable,
                    'amount_owed' => $closingOwed,
                    'position_status' => $positionStatus,
                ],
                'reconciliation' => [
                    'is_reconciled' => $reconciliation['is_reconciled'],
                    'statement_closing_balance' => $closingBalance,
                    'account_current_balance' => $reconciliation['account_current_balance'],
                    'all_time_ledger_balance' => $reconciliation['all_time_ledger_balance'],
                    'discrepancy' => $reconciliation['discrepancy'],
                    'discrepancy_detected' => $reconciliation['discrepancy_detected'],
                ],
            ],
            'supporting_schedules' => $supportingSchedules,
            'transactions' => [
                'data' => $paginatedData,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalLines,
                'last_page' => $lastPage,
            ],
            'booking_integration' => [
                'status' => 'active_from_invoice_items',
                'booking_table_exists' => false,
                'line_item_references_supported' => true,
                'description' => 'Authentic booking references extracted directly from invoice line items (invoice_items.booking_reference).',
            ],
        ];
    }

    /**
     * Query all ledger entries for the supplier and currency up to the end date, sorted deterministically.
     */
    private function compileLedgerEntries(Supplier $supplier, string $currency, Carbon $endDate): Collection
    {
        return SupplierLedgerEntry::query()
            ->where('supplier_id', $supplier->id)
            ->where('currency', $currency)
            ->whereDate('transaction_date', '<=', $endDate->toDateString())
            ->with([
                'invoice:id,reference,status,issue_date',
                'invoiceItem:id,invoice_id,booking_reference,description,service_name_snapshot,quantity,purchase_unit_cost,purchase_currency',
                'reversals:id,reference,reversal_of_id,transaction_date',
                'reversalOf:id,reference,transaction_date',
                'creator:id,name',
            ])
            ->orderBy('transaction_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();
    }

    /**
     * Reconcile reconstructed ledger balances with stored SupplierBalanceAccount.
     */
    private function reconcileWithStoredAccount(
        Supplier $supplier,
        string $currency,
        int $statementPeriodClosingMinor,
        Carbon $endDate
    ): array {
        $account = SupplierBalanceAccount::query()
            ->where('supplier_id', $supplier->id)
            ->where('currency', $currency)
            ->first();

        $accountCurrentBalance = $account ? Money::normalize($account->current_balance, $currency) : Money::normalize(0, $currency);
        $accountCurrentMinor = Money::toMinorUnits($accountCurrentBalance, $currency);

        // Calculate all-time ledger total for this supplier & currency across all dates
        $allEntries = SupplierLedgerEntry::query()
            ->where('supplier_id', $supplier->id)
            ->where('currency', $currency)
            ->get(['direction', 'amount']);

        $allTimeLedgerMinor = 0;
        foreach ($allEntries as $entry) {
            $amtMinor = Money::toMinorUnits($entry->amount, $currency);
            if ($entry->direction === SupplierLedgerDirection::CREDIT) {
                $allTimeLedgerMinor += $amtMinor;
            } else {
                $allTimeLedgerMinor -= $amtMinor;
            }
        }

        $allTimeLedgerBalance = Money::fromMinorUnits($allTimeLedgerMinor, $currency);

        // Stored account must match all-time reconstructed ledger balance
        $isReconciled = ($accountCurrentMinor === $allTimeLedgerMinor);
        $discrepancyMinor = $accountCurrentMinor - $allTimeLedgerMinor;
        $discrepancy = Money::fromMinorUnits($discrepancyMinor, $currency);

        return [
            'is_reconciled' => $isReconciled,
            'account_current_balance' => $accountCurrentBalance,
            'all_time_ledger_balance' => $allTimeLedgerBalance,
            'discrepancy' => $discrepancy,
            'discrepancy_detected' => !$isReconciled,
        ];
    }

    /**
     * Build supporting schedules for funding deposits and invoice usage within the period.
     */
    private function buildSupportingSchedules(array $periodEntries, string $currency): array
    {
        $fundingSchedule = [];
        $usageSchedule = [];

        foreach ($periodEntries as $entry) {
            if ($entry->type === SupplierLedgerType::FUNDING) {
                $fundingSchedule[] = [
                    'ledger_reference' => $entry->reference,
                    'transaction_date' => $entry->transaction_date ? $entry->transaction_date->toDateString() : $entry->created_at->toDateString(),
                    'payment_method' => $entry->payment_method?->value,
                    'external_reference' => $entry->external_reference,
                    'amount' => Money::normalize($entry->amount, $currency),
                    'currency' => $currency,
                    'notes' => $entry->notes,
                ];
            } elseif ($entry->type === SupplierLedgerType::INVOICE_USAGE) {
                $usageSchedule[] = [
                    'ledger_reference' => $entry->reference,
                    'transaction_date' => $entry->transaction_date ? $entry->transaction_date->toDateString() : $entry->created_at->toDateString(),
                    'invoice_id' => $entry->invoice_id,
                    'invoice_reference' => $entry->invoice?->reference,
                    'invoice_status' => $entry->invoice?->status?->value ?? (string) $entry->invoice?->status,
                    'invoice_issue_date' => $entry->invoice?->issue_date ? $entry->invoice->issue_date->toDateString() : null,
                    'invoice_item_id' => $entry->invoice_item_id,
                    'booking_reference' => $entry->invoiceItem?->booking_reference,
                    'service_description' => $entry->invoiceItem?->description ?: $entry->invoiceItem?->service_name_snapshot ?: 'Service item',
                    'quantity' => $entry->invoiceItem?->quantity ? Money::normalize($entry->invoiceItem->quantity, $currency) : null,
                    'unit_cost' => $entry->invoiceItem?->purchase_unit_cost ? Money::normalize($entry->invoiceItem->purchase_unit_cost, $currency) : null,
                    'total_cost' => Money::normalize($entry->amount, $currency),
                    'currency' => $currency,
                    'is_reversed' => $entry->reversals->isNotEmpty(),
                    'reversal_reference' => $entry->reversals->first()?->reference,
                ];
            }
        }

        return [
            'funding_schedule' => $fundingSchedule,
            'invoice_usage_schedule' => $usageSchedule,
        ];
    }
}

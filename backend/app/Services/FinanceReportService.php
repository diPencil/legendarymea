<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\SupplierLedgerType;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Supplier;
use App\Models\SupplierLedgerEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FinanceReportService
{
    public function overview(array $filters = []): array
    {
        return [
            'overview' => $this->overviewMetrics($filters),
            'cash_flow' => $this->cashFlow($filters),
            'sales_profit' => $this->salesAndProfit($filters),
            'suppliers' => $this->suppliers($filters),
            'sales_team' => $this->salesTeam($filters),
            'receivables' => $this->receivables($filters),
            'service_breakdown' => $this->serviceBreakdown($filters),
        ];
    }

    public function overviewMetrics(array $filters = []): array
    {
        $sales = $this->salesAndProfit($filters);
        $cashFlow = $this->cashFlow($filters);
        $receivables = $this->receivables($filters);

        return [
            'sales' => $sales['sales'],
            'gross_profit' => $sales['gross_profit'],
            'cash_in' => $cashFlow['cash_in'],
            'cash_out' => $cashFlow['cash_out'],
            'cogs' => $cashFlow['cogs'],
            'outstanding' => $receivables['outstanding'],
        ];
    }

    public function cashFlow(array $filters = []): array
    {
        $payments = $this->applyPaymentFilters(Payment::query()->where('status', 'posted'), $filters)->get();
        $ledger = $this->applyLedgerFilters(SupplierLedgerEntry::query(), $filters)->get();
        $cogs = $this->applyLedgerInvoiceFilters(
            $this->applyLedgerFilters(SupplierLedgerEntry::query()->where('type', SupplierLedgerType::INVOICE_USAGE), $filters),
            $filters
        )->get();

        return [
            'cash_in' => $this->groupCurrencyTotals($payments, 'currency', 'amount'),
            'cash_out' => $this->groupCurrencyTotals($ledger->where('type', SupplierLedgerType::FUNDING), 'currency', 'amount'),
            'cogs' => $this->groupCurrencyTotals($cogs, 'currency', 'amount'),
        ];
    }

    public function salesAndProfit(array $filters = []): array
    {
        $invoices = $this->applyInvoiceFilters(
            Invoice::query()->whereIn('status', [
                InvoiceStatus::ISSUED,
                InvoiceStatus::PARTIALLY_PAID,
                InvoiceStatus::PAID,
                InvoiceStatus::OVERDUE,
            ]),
            $filters
        )->get();

        $sales = $this->groupCurrencyTotals($invoices, 'currency', 'total_amount');
        $supplierCost = $this->groupCurrencyTotals(
            $this->applyLedgerInvoiceFilters(
                $this->applyLedgerFilters(SupplierLedgerEntry::query()->where('type', SupplierLedgerType::INVOICE_USAGE), $filters),
                $filters
            )->get(),
            'currency',
            'amount'
        );

        return [
            'sales' => $sales,
            'supplier_cost' => $supplierCost,
            'gross_profit' => $this->subtractCurrencyTotals($sales, $supplierCost),
        ];
    }

    public function suppliers(array $filters = []): array
    {
        $suppliers = Supplier::with(['balanceAccounts.ledgerEntries']);

        if (!empty($filters['supplier_id'])) {
            $suppliers->whereKey($filters['supplier_id']);
        }

        return $suppliers->get()->map(function (Supplier $supplier) {
            return [
                'supplier' => [
                    'id' => $supplier->id,
                    'reference' => $supplier->reference,
                    'name' => $supplier->name,
                ],
                'currencies' => $supplier->balanceAccounts->map(function ($account) {
                    $funded = (float) $account->ledgerEntries->where('type', SupplierLedgerType::FUNDING)->sum('amount');
                    $used = (float) $account->ledgerEntries->where('type', SupplierLedgerType::INVOICE_USAGE)->sum('amount');

                    return [
                        'currency' => $account->currency,
                        'funded' => number_format($funded, 2, '.', ''),
                        'used' => number_format($used, 2, '.', ''),
                        'available' => number_format($funded - $used, 2, '.', ''),
                    ];
                })->values(),
            ];
        })->values()->all();
    }

    public function salesTeam(array $filters = []): array
    {
        $invoices = $this->applyInvoiceFilters(
            Invoice::with('soldByEmployee.user')
                ->whereIn('status', $this->reportableInvoiceStatuses())
                ->whereNotNull('sold_by_employee_id')
                ->whereHas('soldByEmployee', function (Builder $query) {
                    $query->where('status', 'active')
                        ->where('department', 'Sales')
                        ->where('is_sales_eligible', true);
                }),
            $filters
        )->get()->groupBy('sold_by_employee_id');

        return $invoices->map(function (Collection $group) {
            $employee = $group->first()->soldByEmployee;

            return [
                'employee' => [
                    'id' => $employee?->id,
                    'employee_code' => $employee?->employee_code,
                    'name' => $employee?->user?->name,
                ],
                'invoice_count' => $group->count(),
                'sales' => $this->groupCurrencyTotals($group, 'currency', 'total_amount'),
                'collected' => $this->groupCurrencyTotals($group->map(function (Invoice $invoice) {
                    return (object) ['currency' => $invoice->currency, 'amount' => $invoice->postedPaymentsTotal()];
                }), 'currency', 'amount'),
                'outstanding' => $this->groupCurrencyTotals($group->map(function (Invoice $invoice) {
                    return (object) ['currency' => $invoice->currency, 'amount' => $invoice->balanceDue()];
                }), 'currency', 'amount'),
                'supplier_cost' => $this->groupCurrencyTotals($group, 'currency', 'supplier_total_cost'),
                'profit' => $this->groupCurrencyTotals($group, 'currency', 'gross_profit'),
            ];
        })->values()->all();
    }

    public function receivables(array $filters = []): array
    {
        $invoices = $this->applyInvoiceFilters(
            Invoice::query()->whereIn('status', [
                InvoiceStatus::ISSUED,
                InvoiceStatus::PARTIALLY_PAID,
                InvoiceStatus::OVERDUE,
            ]),
            $filters
        )->get();

        return [
            'outstanding' => $this->groupCurrencyTotals($invoices->map(function (Invoice $invoice) {
                return (object) ['currency' => $invoice->currency, 'amount' => $invoice->balanceDue()];
            }), 'currency', 'amount'),
        ];
    }

    public function serviceBreakdown(array $filters = []): array
    {
        $items = $this->applyInvoiceFilters(Invoice::with('items.serviceCatalog')->whereIn('status', [
            ...$this->reportableInvoiceStatuses(),
        ]), $filters)->get()
            ->flatMap(fn (Invoice $invoice) => $invoice->items->map(fn ($item) => [
                'service_type' => $item->serviceCatalog ? $item->serviceCatalog->code : ($item->service_type ?? 'unknown'),
                'currency' => $invoice->currency,
                'sales' => $item->line_total,
                'cost' => $item->converted_line_cost,
                'profit' => $item->line_profit,
            ]))
            ->groupBy('service_type');

        return $items->map(function (Collection $group, string $serviceType) {
            return [
                'service_type' => $serviceType,
                'sales' => $this->groupCurrencyTotals($group->map(fn (array $row) => (object) ['currency' => $row['currency'], 'amount' => $row['sales']]), 'currency', 'amount'),
                'cost' => $this->groupCurrencyTotals($group->map(fn (array $row) => (object) ['currency' => $row['currency'], 'amount' => $row['cost']]), 'currency', 'amount'),
                'profit' => $this->groupCurrencyTotals($group->map(fn (array $row) => (object) ['currency' => $row['currency'], 'amount' => $row['profit']]), 'currency', 'amount'),
            ];
        })->values()->all();
    }

    private function applyInvoiceFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['currency'])) {
            $query->where('currency', strtoupper((string) $filters['currency']));
        }
        if (!empty($filters['customer_type'])) {
            $query->where('customer_type', $filters['customer_type']);
        }
        if (!empty($filters['customer_user_id'])) {
            $query->where('customer_user_id', $filters['customer_user_id']);
        }
        if (!empty($filters['company_id'])) {
            $query->where('company_id', $filters['company_id']);
        }
        if (!empty($filters['sold_by_employee_id'])) {
            $query->where('sold_by_employee_id', $filters['sold_by_employee_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('issue_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('issue_date', '<=', $filters['date_to']);
        }

        return $query;
    }

    private function applyLedgerInvoiceFilters(Builder $query, array $filters): Builder
    {
        $query->whereHas('invoice', function (Builder $invoiceQuery) use ($filters) {
            $this->applyInvoiceFilters($invoiceQuery->whereIn('status', $this->reportableInvoiceStatuses()), $filters);
        });

        return $query;
    }

    private function applyPaymentFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['currency'])) {
            $query->where('currency', strtoupper((string) $filters['currency']));
        }
        if (!empty($filters['payment_method'])) {
            $query->where('method', $filters['payment_method']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('paid_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('paid_at', '<=', $filters['date_to']);
        }

        return $query;
    }

    private function applyLedgerFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['currency'])) {
            $query->where('currency', strtoupper((string) $filters['currency']));
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('transaction_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('transaction_date', '<=', $filters['date_to']);
        }

        return $query;
    }

    private function groupCurrencyTotals(iterable $rows, string $currencyField, string $amountField): array
    {
        $totals = [];

        foreach ($rows as $row) {
            $currency = strtoupper((string) data_get($row, $currencyField));
            $amount = (float) data_get($row, $amountField);
            $totals[$currency] = ($totals[$currency] ?? 0) + $amount;
        }

        ksort($totals);

        return collect($totals)->map(fn (float $amount, string $currency) => [
            'currency' => $currency,
            'amount' => number_format($amount, 2, '.', ''),
        ])->values()->all();
    }

    private function subtractCurrencyTotals(array $left, array $right): array
    {
        $totals = [];

        foreach ($left as $row) {
            $totals[$row['currency']] = ($totals[$row['currency']] ?? 0) + (float) $row['amount'];
        }

        foreach ($right as $row) {
            $totals[$row['currency']] = ($totals[$row['currency']] ?? 0) - (float) $row['amount'];
        }

        ksort($totals);

        return collect($totals)->map(fn (float $amount, string $currency) => [
            'currency' => $currency,
            'amount' => number_format($amount, 2, '.', ''),
        ])->values()->all();
    }

    /**
     * @return array<int, InvoiceStatus>
     */
    private function reportableInvoiceStatuses(): array
    {
        return [
            InvoiceStatus::ISSUED,
            InvoiceStatus::PARTIALLY_PAID,
            InvoiceStatus::PAID,
            InvoiceStatus::OVERDUE,
        ];
    }
}

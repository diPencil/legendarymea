<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class CompanyStatementService
{
    /**
     * Get all distinct currencies used by this company across invoices and payments.
     *
     * @return string[]
     */
    public function getAvailableCurrencies(Company $company): array
    {
        $invoiceCurrencies = Invoice::query()
            ->where('company_id', $company->id)
            ->whereNotNull('currency')
            ->distinct()
            ->pluck('currency')
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter();

        $paymentCurrencies = Payment::query()
            ->where('company_id', $company->id)
            ->whereNotNull('currency')
            ->distinct()
            ->pluck('currency')
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter();

        $allCurrencies = $invoiceCurrencies
            ->merge($paymentCurrencies)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return !empty($allCurrencies) ? $allCurrencies : ['AED'];
    }

    /**
     * Generate the complete company account statement.
     *
     * @param Company $company
     * @param array{
     *     currency?: string,
     *     start_date?: string,
     *     end_date?: string,
     *     type?: string,
     *     page?: int,
     *     per_page?: int,
     * } $filters
     * @return array
     */
    public function getStatement(Company $company, array $filters = []): array
    {
        // 1. Resolve Currency
        $availableCurrencies = $this->getAvailableCurrencies($company);
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

        // 3. Compile Master Chronological Event Stream up to endDate
        $events = $this->compileEvents($company, $currency, $endDate);

        // 4. Partition Events into Opening (before startDate) vs Period (between startDate and endDate)
        $openingEvents = [];
        $periodEvents = [];

        foreach ($events as $event) {
            $eventTime = $event['timestamp'];
            if ($eventTime->isBefore($startDate)) {
                $openingEvents[] = $event;
            } else {
                $periodEvents[] = $event;
            }
        }

        // 5. Calculate Opening Balances from Opening Events
        $openingBalances = $this->calculateBalances($openingEvents, $currency);

        // 6. Calculate Running Balances and Ledger Lines for Period Events
        $runningReceivablesMinor = Money::toMinorUnits($openingBalances['receivables'], $currency);
        $runningCreditMinor = Money::toMinorUnits($openingBalances['unallocated_credit'], $currency);
        $runningNetMinor = Money::toMinorUnits($openingBalances['net_position'], $currency);

        $periodLines = [];
        $periodInvoicedMinor = 0;
        $periodPaymentsReceivedMinor = 0;
        $periodCreditAppliedMinor = 0;
        $periodAllocationsReversedMinor = 0;
        $periodPaymentsReversedMinor = 0;

        foreach ($periodEvents as $event) {
            $deltaR = $event['delta_receivables_minor'];
            $deltaC = $event['delta_credit_minor'];
            $deltaN = $event['delta_net_minor'];

            $runningReceivablesMinor += $deltaR;
            $runningCreditMinor += $deltaC;
            $runningNetMinor += $deltaN;

            // Accumulate period totals
            if ($event['type'] === 'invoice_issued') {
                $periodInvoicedMinor += $event['amount_minor'];
            } elseif ($event['type'] === 'payment_received') {
                $periodPaymentsReceivedMinor += $event['amount_minor'];
            } elseif ($event['type'] === 'credit_applied') {
                $periodCreditAppliedMinor += $event['amount_minor'];
            } elseif ($event['type'] === 'allocation_reversed') {
                $periodAllocationsReversedMinor += $event['amount_minor'];
            } elseif ($event['type'] === 'payment_reversed') {
                $periodPaymentsReversedMinor += $event['amount_minor'];
            }

            $line = [
                'id' => $event['line_id'],
                'date' => $event['date']->toIso8601String(),
                'type' => $event['type'],
                'type_label' => $event['type_label'],
                'reference' => $event['reference'],
                'description' => $event['description'],
                'invoice_reference' => $event['invoice_reference'],
                'payment_reference' => $event['payment_reference'],
                'booking_references' => $event['booking_references'],
                'debit' => $event['debit'],
                'credit' => $event['credit'],
                'amount' => Money::fromMinorUnits($event['amount_minor'], $currency),
                'net_effect' => Money::fromMinorUnits($deltaN, $currency),
                'running_balance' => Money::fromMinorUnits($runningNetMinor, $currency),
                'running_receivables' => Money::fromMinorUnits($runningReceivablesMinor, $currency),
                'running_unallocated_credit' => Money::fromMinorUnits($runningCreditMinor, $currency),
                'metadata' => $event['metadata'],
            ];

            $periodLines[] = $line;
        }

        // 7. Calculate Closing Balances
        $closingReceivables = Money::fromMinorUnits($runningReceivablesMinor, $currency);
        $closingUnallocatedCredit = Money::fromMinorUnits($runningCreditMinor, $currency);
        $closingNetPosition = Money::fromMinorUnits($runningNetMinor, $currency);

        $periodNetChangeMinor = $runningNetMinor - Money::toMinorUnits($openingBalances['net_position'], $currency);
        $periodNetChange = Money::fromMinorUnits($periodNetChangeMinor, $currency);

        // 8. Reconcile Exact Financial Invariants
        $openingNetMinor = Money::toMinorUnits($openingBalances['net_position'], $currency);
        $expectedClosingNetMinor = $openingNetMinor + $periodNetChangeMinor;
        $isReconciled = ($expectedClosingNetMinor === $runningNetMinor)
            && ($runningNetMinor === ($runningReceivablesMinor - $runningCreditMinor));

        // 9. Supporting Schedules (As-Of Open Invoices & Available Credits)
        $activeInvoicesBreakdown = $this->getActiveInvoicesBreakdown($company, $currency, $endDate);
        $unallocatedCreditsBreakdown = $this->getUnallocatedCreditsBreakdown($company, $currency, $endDate);

        // 10. Filter Transaction Lines (if requested) & Paginate
        $filteredLines = $periodLines;
        $typeFilter = strtolower(trim((string) ($filters['type'] ?? 'all')));
        if ($typeFilter && $typeFilter !== 'all') {
            $filteredLines = array_values(array_filter($filteredLines, function ($l) use ($typeFilter) {
                return match ($typeFilter) {
                    'invoices' => in_array($l['type'], ['invoice_issued', 'invoice_cancelled'], true),
                    'payments' => in_array($l['type'], ['payment_received', 'payment_reversed'], true),
                    'allocations' => in_array($l['type'], ['credit_applied', 'allocation_reversed'], true),
                    'reversals' => in_array($l['type'], ['allocation_reversed', 'payment_reversed'], true),
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
            'company' => [
                'id' => $company->id,
                'reference' => $company->reference,
                'name' => $company->name,
                'legal_name' => $company->legal_name,
                'tax_number' => $company->tax_number,
                'registration_number' => $company->registration_number,
                'email' => $company->email,
                'phone' => $company->phone,
                'country_code' => $company->country_code,
                'city' => $company->city,
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
                    'receivables' => $openingBalances['receivables'],
                    'unallocated_credit' => $openingBalances['unallocated_credit'],
                    'net_position' => $openingBalances['net_position'],
                ],
                'period_movements' => [
                    'invoiced_total' => Money::fromMinorUnits($periodInvoicedMinor, $currency),
                    'payments_received' => Money::fromMinorUnits($periodPaymentsReceivedMinor, $currency),
                    'credit_applied' => Money::fromMinorUnits($periodCreditAppliedMinor, $currency),
                    'allocations_reversed' => Money::fromMinorUnits($periodAllocationsReversedMinor, $currency),
                    'payments_reversed' => Money::fromMinorUnits($periodPaymentsReversedMinor, $currency),
                    'net_change' => $periodNetChange,
                ],
                'closing_balance' => [
                    'receivables' => $closingReceivables,
                    'unallocated_credit' => $closingUnallocatedCredit,
                    'net_position' => $closingNetPosition,
                ],
                'reconciliation' => [
                    'opening_net_position' => $openingBalances['net_position'],
                    'period_net_change' => $periodNetChange,
                    'calculated_closing_net' => Money::fromMinorUnits($expectedClosingNetMinor, $currency),
                    'verified_closing_net' => $closingNetPosition,
                    'is_reconciled' => $isReconciled,
                ],
            ],
            'transactions' => [
                'data' => $paginatedData,
                'meta' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $totalLines,
                    'last_page' => $lastPage,
                ],
            ],
            'active_invoices_breakdown' => $activeInvoicesBreakdown,
            'unallocated_credits_breakdown' => $unallocatedCreditsBreakdown,
            'booking_integration' => [
                'status' => 'embedded_line_item_references',
                'description' => 'Authentic booking references are extracted from invoice items. No standalone booking table exists in the system.',
            ],
        ];
    }

    /**
     * Compile all financial events up to the end date in deterministic chronological order.
     */
    private function compileEvents(Company $company, string $currency, Carbon $asOfLimit): array
    {
        $events = [];

        // 1. Invoices
        $invoices = Invoice::query()
            ->with(['items', 'contract'])
            ->where('company_id', $company->id)
            ->where('currency', $currency)
            ->whereIn('status', [
                InvoiceStatus::ISSUED,
                InvoiceStatus::PARTIALLY_PAID,
                InvoiceStatus::PAID,
                InvoiceStatus::OVERDUE,
                InvoiceStatus::CANCELLED,
            ])
            ->get();

        foreach ($invoices as $invoice) {
            $issueDate = $invoice->issue_date
                ? Carbon::parse($invoice->issue_date, 'UTC')->startOfDay()
                : Carbon::parse($invoice->created_at, 'UTC');

            if ($issueDate->isAfter($asOfLimit)) {
                continue;
            }

            $bookingReferences = $invoice->items
                ->pluck('booking_reference')
                ->filter()
                ->unique()
                ->values()
                ->all();

            $amountMinor = Money::toMinorUnits($invoice->total_amount, $currency);

            // Event: Invoice Issued
            $events[] = [
                'line_id' => "INV-{$invoice->id}",
                'timestamp' => $issueDate,
                'priority' => 1,
                'entity_id' => $invoice->id,
                'sub_id' => 0,
                'date' => $issueDate,
                'type' => 'invoice_issued',
                'type_label' => 'Invoice Issued',
                'reference' => $invoice->reference,
                'description' => "Invoice issued ({$invoice->reference})",
                'invoice_reference' => $invoice->reference,
                'payment_reference' => null,
                'booking_references' => $bookingReferences,
                'debit' => Money::fromMinorUnits($amountMinor, $currency),
                'credit' => Money::fromMinorUnits(0, $currency),
                'amount_minor' => $amountMinor,
                'delta_receivables_minor' => $amountMinor,
                'delta_credit_minor' => 0,
                'delta_net_minor' => $amountMinor,
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'status' => $invoice->status->value,
                    'due_date' => $invoice->due_date?->toDateString(),
                    'contract_reference' => $invoice->contract?->reference,
                ],
            ];

            // Event: Invoice Cancelled (if cancelled within window)
            if ($invoice->status === InvoiceStatus::CANCELLED) {
                $cancelDate = Carbon::parse($invoice->updated_at, 'UTC');
                if ($cancelDate->lte($asOfLimit)) {
                    $events[] = [
                        'line_id' => "INV-CANCEL-{$invoice->id}",
                        'timestamp' => $cancelDate,
                        'priority' => 6,
                        'entity_id' => $invoice->id,
                        'sub_id' => 0,
                        'date' => $cancelDate,
                        'type' => 'invoice_cancelled',
                        'type_label' => 'Invoice Cancelled',
                        'reference' => $invoice->reference,
                        'description' => "Invoice cancelled ({$invoice->reference})",
                        'invoice_reference' => $invoice->reference,
                        'payment_reference' => null,
                        'booking_references' => $bookingReferences,
                        'debit' => Money::fromMinorUnits(0, $currency),
                        'credit' => Money::fromMinorUnits($amountMinor, $currency),
                        'amount_minor' => $amountMinor,
                        'delta_receivables_minor' => -$amountMinor,
                        'delta_credit_minor' => 0,
                        'delta_net_minor' => -$amountMinor,
                        'metadata' => [
                            'invoice_id' => $invoice->id,
                        ],
                    ];
                }
            }
        }

        // 2. Payments
        $payments = Payment::query()
            ->with(['allocations.invoice', 'recorder', 'reverser'])
            ->where('company_id', $company->id)
            ->where('currency', $currency)
            ->whereIn('status', [PaymentStatus::POSTED, PaymentStatus::REVERSED])
            ->get();

        foreach ($payments as $payment) {
            $paymentDate = Carbon::parse($payment->paid_at ?? $payment->created_at, 'UTC');
            if ($paymentDate->isAfter($asOfLimit)) {
                continue;
            }

            $totalAmountMinor = Money::toMinorUnits($payment->amount, $currency);
            $methodLabel = $payment->method instanceof \BackedEnum ? $payment->method->value : (string) $payment->method;

            // Separate immediate allocations created with payment vs later credit applications
            $immediateAllocations = [];
            $subsequentCreditAllocations = [];

            foreach ($payment->allocations as $alloc) {
                $allocDate = Carbon::parse($alloc->created_at, 'UTC');
                // Flagged as credit application if applied_by is set (CompanyCreditService) or created subsequent to payment receipt
                if ($alloc->applied_by !== null || $allocDate->diffInSeconds($paymentDate) > 60) {
                    $subsequentCreditAllocations[] = $alloc;
                } else {
                    $immediateAllocations[] = $alloc;
                }
            }

            // At payment receipt:
            // Delta Receivables = - sum of immediate allocations
            // Delta Unallocated Credit = + (payment amount - sum of immediate allocations)
            // Delta Net = - payment amount
            $immediateAllocTotalMinor = 0;
            $immediateDetails = [];
            foreach ($immediateAllocations as $immAlloc) {
                $immMinor = Money::toMinorUnits($immAlloc->amount, $currency);
                $immediateAllocTotalMinor += $immMinor;
                $immediateDetails[] = [
                    'invoice_id' => $immAlloc->invoice_id,
                    'invoice_reference' => $immAlloc->invoice_reference ?? $immAlloc->invoice?->reference,
                    'amount' => Money::normalize($immAlloc->amount, $currency),
                ];
            }

            $initialCreditMinor = $totalAmountMinor - $immediateAllocTotalMinor;

            // Event: Payment Received
            $events[] = [
                'line_id' => "PAY-{$payment->id}",
                'timestamp' => $paymentDate,
                'priority' => 2,
                'entity_id' => $payment->id,
                'sub_id' => 0,
                'date' => $paymentDate,
                'type' => 'payment_received',
                'type_label' => 'Payment Received',
                'reference' => $payment->reference,
                'description' => "Payment received via {$methodLabel}" . ($payment->transaction_reference ? " (Ref: {$payment->transaction_reference})" : ''),
                'invoice_reference' => !empty($immediateDetails) ? implode(', ', array_column($immediateDetails, 'invoice_reference')) : null,
                'payment_reference' => $payment->reference,
                'booking_references' => [],
                'debit' => Money::fromMinorUnits(0, $currency),
                'credit' => Money::fromMinorUnits($totalAmountMinor, $currency),
                'amount_minor' => $totalAmountMinor,
                'delta_receivables_minor' => -$immediateAllocTotalMinor,
                'delta_credit_minor' => $initialCreditMinor,
                'delta_net_minor' => -$totalAmountMinor,
                'metadata' => [
                    'payment_id' => $payment->id,
                    'method' => $methodLabel,
                    'transaction_reference' => $payment->transaction_reference,
                    'immediate_allocations' => $immediateDetails,
                    'initial_unallocated_credit' => Money::fromMinorUnits($initialCreditMinor, $currency),
                ],
            ];

            // 3. Subsequent Credit Applications
            foreach ($subsequentCreditAllocations as $subAlloc) {
                $subDate = Carbon::parse($subAlloc->created_at, 'UTC');
                if ($subDate->isAfter($asOfLimit)) {
                    continue;
                }

                $subAmountMinor = Money::toMinorUnits($subAlloc->amount, $currency);
                $invRef = $subAlloc->invoice_reference ?? $subAlloc->invoice?->reference ?? "#{$subAlloc->invoice_id}";

                $events[] = [
                    'line_id' => "CREDIT-APP-{$subAlloc->id}",
                    'timestamp' => $subDate,
                    'priority' => 3,
                    'entity_id' => $payment->id,
                    'sub_id' => $subAlloc->id,
                    'date' => $subDate,
                    'type' => 'credit_applied',
                    'type_label' => 'Credit Applied',
                    'reference' => "CA-{$subAlloc->id}",
                    'description' => "Company credit applied to {$invRef} from {$payment->reference}",
                    'invoice_reference' => $invRef,
                    'payment_reference' => $payment->reference,
                    'booking_references' => [],
                    'debit' => Money::fromMinorUnits(0, $currency),
                    'credit' => Money::fromMinorUnits(0, $currency), // Net cash is unchanged
                    'amount_minor' => $subAmountMinor,
                    'delta_receivables_minor' => -$subAmountMinor,
                    'delta_credit_minor' => -$subAmountMinor,
                    'delta_net_minor' => 0, // No new revenue or debt change
                    'metadata' => [
                        'allocation_id' => $subAlloc->id,
                        'source_payment_reference' => $payment->reference,
                        'target_invoice_reference' => $invRef,
                    ],
                ];
            }

            // 4. Allocation Reversals (individual allocation reversals on active payment)
            foreach ($payment->allocations as $alloc) {
                if ($alloc->reversed_at && $payment->status !== PaymentStatus::REVERSED) {
                    $revDate = Carbon::parse($alloc->reversed_at, 'UTC');
                    if ($revDate->isAfter($asOfLimit)) {
                        continue;
                    }

                    $revAmountMinor = Money::toMinorUnits($alloc->amount, $currency);
                    $invRef = $alloc->invoice_reference ?? $alloc->invoice?->reference ?? "#{$alloc->invoice_id}";

                    $events[] = [
                        'line_id' => "ALLOC-REV-{$alloc->id}",
                        'timestamp' => $revDate,
                        'priority' => 4,
                        'entity_id' => $payment->id,
                        'sub_id' => $alloc->id,
                        'date' => $revDate,
                        'type' => 'allocation_reversed',
                        'type_label' => 'Allocation Reversed',
                        'reference' => "AR-{$alloc->id}",
                        'description' => "Allocation reversed on {$invRef} from {$payment->reference}" . ($alloc->reversal_reason ? ": {$alloc->reversal_reason}" : ''),
                        'invoice_reference' => $invRef,
                        'payment_reference' => $payment->reference,
                        'booking_references' => [],
                        'debit' => Money::fromMinorUnits(0, $currency),
                        'credit' => Money::fromMinorUnits(0, $currency),
                        'amount_minor' => $revAmountMinor,
                        'delta_receivables_minor' => $revAmountMinor,
                        'delta_credit_minor' => $revAmountMinor,
                        'delta_net_minor' => 0,
                        'metadata' => [
                            'allocation_id' => $alloc->id,
                            'reversal_reason' => $alloc->reversal_reason,
                            'reverser' => $alloc->reverser?->name,
                        ],
                    ];
                }
            }

            // 5. Full Payment Reversal
            if ($payment->status === PaymentStatus::REVERSED && $payment->reversed_at) {
                $revDate = Carbon::parse($payment->reversed_at, 'UTC');
                if ($revDate->isBefore($asOfLimit)) {
                    // When full payment is reversed, all active allocations are restored to receivables,
                    // and remaining credit is cancelled. Total net change = +payment.amount
                    $events[] = [
                        'line_id' => "PAY-REV-{$payment->id}",
                        'timestamp' => $revDate,
                        'priority' => 5,
                        'entity_id' => $payment->id,
                        'sub_id' => 0,
                        'date' => $revDate,
                        'type' => 'payment_reversed',
                        'type_label' => 'Payment Reversed',
                        'reference' => $payment->reference,
                        'description' => "Payment reversed ({$payment->reference})" . ($payment->reversal_reason ? ": {$payment->reversal_reason}" : ''),
                        'invoice_reference' => null,
                        'payment_reference' => $payment->reference,
                        'booking_references' => [],
                        'debit' => Money::fromMinorUnits($totalAmountMinor, $currency),
                        'credit' => Money::fromMinorUnits(0, $currency),
                        'amount_minor' => $totalAmountMinor,
                        'delta_receivables_minor' => $totalAmountMinor - Money::toMinorUnits($payment->unallocated_amount, $currency),
                        'delta_credit_minor' => -Money::toMinorUnits($payment->unallocated_amount, $currency),
                        'delta_net_minor' => $totalAmountMinor,
                        'metadata' => [
                            'payment_id' => $payment->id,
                            'reversal_reason' => $payment->reversal_reason,
                            'reverser' => $payment->reverser?->name,
                        ],
                    ];
                }
            }
        }

        // 6. Sort all events in deterministic chronological order
        usort($events, function (array $a, array $b) {
            // 1. Effective timestamp ASC
            $timeCompare = $a['timestamp']->getTimestamp() <=> $b['timestamp']->getTimestamp();
            if ($timeCompare !== 0) {
                return $timeCompare;
            }

            // 2. Event priority ASC
            $priorityCompare = $a['priority'] <=> $b['priority'];
            if ($priorityCompare !== 0) {
                return $priorityCompare;
            }

            // 3. Entity ID ASC
            $idCompare = $a['entity_id'] <=> $b['entity_id'];
            if ($idCompare !== 0) {
                return $idCompare;
            }

            // 4. Sub ID ASC
            return $a['sub_id'] <=> $b['sub_id'];
        });

        return $events;
    }

    /**
     * Calculate balances from a stream of events.
     */
    private function calculateBalances(array $events, string $currency): array
    {
        $receivablesMinor = 0;
        $creditMinor = 0;
        $netMinor = 0;

        foreach ($events as $event) {
            $receivablesMinor += $event['delta_receivables_minor'];
            $creditMinor += $event['delta_credit_minor'];
            $netMinor += $event['delta_net_minor'];
        }

        return [
            'receivables' => Money::fromMinorUnits($receivablesMinor, $currency),
            'unallocated_credit' => Money::fromMinorUnits($creditMinor, $currency),
            'net_position' => Money::fromMinorUnits($netMinor, $currency),
        ];
    }

    /**
     * Supporting Schedule: Active Invoices breakdown as of the given date.
     */
    private function getActiveInvoicesBreakdown(Company $company, string $currency, Carbon $asOfLimit): array
    {
        $invoices = Invoice::query()
            ->with(['items'])
            ->where('company_id', $company->id)
            ->where('currency', $currency)
            ->whereIn('status', [
                InvoiceStatus::ISSUED,
                InvoiceStatus::PARTIALLY_PAID,
                InvoiceStatus::OVERDUE,
            ])
            ->get();

        $breakdown = [];
        foreach ($invoices as $invoice) {
            $issueDate = $invoice->issue_date
                ? Carbon::parse($invoice->issue_date, 'UTC')->startOfDay()
                : Carbon::parse($invoice->created_at, 'UTC');

            if ($issueDate->isAfter($asOfLimit)) {
                continue;
            }

            $bookingReferences = $invoice->items
                ->pluck('booking_reference')
                ->filter()
                ->unique()
                ->values()
                ->all();

            $balanceDue = $invoice->balanceDue();
            if (Money::compare($balanceDue, 0) > 0) {
                $breakdown[] = [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'issue_date' => $invoice->issue_date?->toDateString(),
                    'due_date' => $invoice->due_date?->toDateString(),
                    'total_amount' => Money::normalize($invoice->total_amount, $currency),
                    'paid_amount' => Money::normalize($invoice->postedPaymentsTotal(), $currency),
                    'balance_due' => Money::normalize($balanceDue, $currency),
                    'status' => $invoice->status->value,
                    'booking_references' => $bookingReferences,
                ];
            }
        }

        return $breakdown;
    }

    /**
     * Supporting Schedule: Active Unallocated Credits breakdown as of the given date.
     */
    private function getUnallocatedCreditsBreakdown(Company $company, string $currency, Carbon $asOfLimit): array
    {
        $payments = Payment::query()
            ->where('company_id', $company->id)
            ->where('currency', $currency)
            ->where('status', PaymentStatus::POSTED)
            ->where('unallocated_amount', '>', 0)
            ->get();

        $breakdown = [];
        foreach ($payments as $payment) {
            $paymentDate = Carbon::parse($payment->paid_at ?? $payment->created_at, 'UTC');
            if ($paymentDate->isAfter($asOfLimit)) {
                continue;
            }

            $breakdown[] = [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'amount' => Money::normalize($payment->amount, $currency),
                'allocated_amount' => Money::normalize($payment->allocated_amount, $currency),
                'unallocated_amount' => Money::normalize($payment->unallocated_amount, $currency),
                'method' => $payment->method instanceof \BackedEnum ? $payment->method->value : (string) $payment->method,
                'transaction_reference' => $payment->transaction_reference,
            ];
        }

        return $breakdown;
    }
}

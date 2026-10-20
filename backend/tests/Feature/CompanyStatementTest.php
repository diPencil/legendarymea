<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Services\CompanyCreditService;
use App\Services\InvoiceSettlementService;
use App\Support\Money;
use Carbon\Carbon;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use ZipArchive;

class CompanyStatementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $clientUser;
    private Company $company;
    private Company $otherCompany;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->employee = User::factory()->create();
        $this->employee->assignRole('employee');

        $this->company = Company::factory()->create();
        $this->otherCompany = Company::factory()->create();

        $this->clientUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->clientUser->assignRole('client');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function createInvoice(array $overrides = []): Invoice
    {
        $comp = $overrides['company'] ?? $this->company;
        unset($overrides['company']);

        $currency = $overrides['currency'] ?? 'AED';
        $total = $overrides['total_amount'] ?? '1000.00';
        $bookingRef = $overrides['booking_reference'] ?? null;
        unset($overrides['booking_reference']);

        $invoice = Invoice::factory()->create(array_merge([
            'company_id' => $comp->id,
            'created_by' => $this->admin->id,
            'status' => InvoiceStatus::ISSUED,
            'currency' => $currency,
            'total_amount' => $total,
            'subtotal' => $total,
            'discount_amount' => Money::normalize(0, $currency),
            'tax_amount' => Money::normalize(0, $currency),
            'issue_date' => Carbon::parse('2026-01-10', 'UTC')->format('Y-m-d'),
            'due_date' => Carbon::parse('2026-01-25', 'UTC')->format('Y-m-d'),
        ], $overrides));

        if ($bookingRef) {
            InvoiceItem::factory()->create([
                'invoice_id' => $invoice->id,
                'booking_reference' => $bookingRef,
                'line_total' => $total,
            ]);
        }

        return $invoice;
    }

    private function createPayment(array $overrides = []): Payment
    {
        $comp = $overrides['company'] ?? $this->company;
        unset($overrides['company']);

        $currency = $overrides['currency'] ?? 'AED';
        $amount = $overrides['amount'] ?? '1000.00';
        $allocated = $overrides['allocated_amount'] ?? '0.00';
        $unallocated = $overrides['unallocated_amount'] ?? Money::subtract($amount, $allocated, $currency);

        return Payment::factory()->create(array_merge([
            'company_id' => $comp->id,
            'customer_type' => 'company',
            'currency' => $currency,
            'amount' => $amount,
            'allocated_amount' => $allocated,
            'unallocated_amount' => $unallocated,
            'status' => PaymentStatus::POSTED,
            'method' => PaymentMethod::BANK_TRANSFER,
            'paid_at' => Carbon::parse('2026-01-15 10:00:00', 'UTC'),
            'recorded_by' => $this->admin->id,
        ], $overrides));
    }

    public function test_zero_activity_statement_returns_balanced_zero_summary(): void
    {
        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('company.id', $this->company->id)
            ->assertJsonPath('currency', 'AED')
            ->assertJsonPath('summary.opening_balance.receivables', '0.00')
            ->assertJsonPath('summary.opening_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.opening_balance.net_position', '0.00')
            ->assertJsonPath('summary.period_movements.invoiced_total', '0.00')
            ->assertJsonPath('summary.period_movements.payments_received', '0.00')
            ->assertJsonPath('summary.closing_balance.receivables', '0.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '0.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true)
            ->assertJsonPath('transactions.data', []);
    }

    public function test_invoices_without_payment_accumulate_receivables(): void
    {
        $this->createInvoice([
            'total_amount' => '1000.00',
            'issue_date' => '2026-01-05',
        ]);
        $this->createInvoice([
            'total_amount' => '2500.00',
            'issue_date' => '2026-01-12',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.period_movements.invoiced_total', '3500.00')
            ->assertJsonPath('summary.period_movements.payments_received', '0.00')
            ->assertJsonPath('summary.closing_balance.receivables', '3500.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '3500.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $transactions = $response->json('transactions.data');
        $this->assertCount(2, $transactions);
        $this->assertSame('1000.00', $transactions[0]['running_balance']);
        $this->assertSame('3500.00', $transactions[1]['running_balance']);
    }

    public function test_multiple_invoices_and_one_payment_multi_invoice_allocation(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '2000.00', 'issue_date' => '2026-01-05']);
        $inv2 = $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-08']);

        $payment = $this->createPayment([
            'amount' => '5000.00',
            'allocated_amount' => '5000.00',
            'unallocated_amount' => '0.00',
            'paid_at' => Carbon::parse('2026-01-15 12:00:00', 'UTC'),
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv1->id,
            'amount' => '2000.00',
            'created_at' => $payment->paid_at,
        ]);
        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv2->id,
            'amount' => '3000.00',
            'created_at' => $payment->paid_at,
        ]);

        app(InvoiceSettlementService::class)->recalculate($inv1);
        app(InvoiceSettlementService::class)->recalculate($inv2);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.period_movements.invoiced_total', '5000.00')
            ->assertJsonPath('summary.period_movements.payments_received', '5000.00')
            ->assertJsonPath('summary.closing_balance.receivables', '0.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '0.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        // Verify cash is counted exactly once (5000.00), not double counted per allocation
        $this->assertSame('5000.00', $response->json('summary.period_movements.payments_received'));
        $this->assertCount(3, $response->json('transactions.data')); // 2 invoices + 1 payment receipt line
    }

    public function test_partial_settlement_and_open_balance_tracking(): void
    {
        $inv = $this->createInvoice(['total_amount' => '10000.00', 'issue_date' => '2026-01-05']);

        $payment = $this->createPayment([
            'amount' => '4000.00',
            'allocated_amount' => '4000.00',
            'unallocated_amount' => '0.00',
            'paid_at' => Carbon::parse('2026-01-12 10:00:00', 'UTC'),
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv->id,
            'amount' => '4000.00',
            'created_at' => $payment->paid_at,
        ]);
        app(InvoiceSettlementService::class)->recalculate($inv);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.closing_balance.receivables', '6000.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '6000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $activeInvoices = $response->json('active_invoices_breakdown');
        $this->assertCount(1, $activeInvoices);
        $this->assertSame('6000.00', $activeInvoices[0]['balance_due']);
        $this->assertSame('4000.00', $activeInvoices[0]['paid_amount']);
    }

    public function test_payment_creates_unallocated_credit(): void
    {
        $inv = $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-05']);

        $payment = $this->createPayment([
            'amount' => '5000.00',
            'allocated_amount' => '3000.00',
            'unallocated_amount' => '2000.00',
            'paid_at' => Carbon::parse('2026-01-10 10:00:00', 'UTC'),
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv->id,
            'amount' => '3000.00',
            'created_at' => $payment->paid_at,
        ]);
        app(InvoiceSettlementService::class)->recalculate($inv);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.closing_balance.receivables', '0.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '2000.00')
            ->assertJsonPath('summary.closing_balance.net_position', '-2000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $unallocatedBreakdown = $response->json('unallocated_credits_breakdown');
        $this->assertCount(1, $unallocatedBreakdown);
        $this->assertSame('2000.00', $unallocatedBreakdown[0]['unallocated_amount']);
    }

    public function test_application_of_existing_credit_does_not_inflate_cash(): void
    {
        // 1. Payment recorded on Jan 5 with 5,000 credit (0 allocated)
        $payment = $this->createPayment([
            'amount' => '5000.00',
            'allocated_amount' => '0.00',
            'unallocated_amount' => '5000.00',
            'paid_at' => Carbon::parse('2026-01-05 10:00:00', 'UTC'),
        ]);

        // 2. Invoice issued on Jan 10 for 3,000
        $inv = $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-10']);

        // 3. Credit application performed on Jan 15 (consuming 3,000 credit)
        Carbon::setTestNow(Carbon::parse('2026-01-15 12:00:00', 'UTC'));
        $creditService = app(CompanyCreditService::class);
        $creditService->applyCredit($payment, [
            'idempotency_key' => 'idemp-statement-test-1',
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '3000.00'],
            ],
        ], $this->admin->id);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.period_movements.invoiced_total', '3000.00')
            ->assertJsonPath('summary.period_movements.payments_received', '5000.00')
            ->assertJsonPath('summary.period_movements.credit_applied', '3000.00')
            ->assertJsonPath('summary.closing_balance.receivables', '0.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '2000.00')
            ->assertJsonPath('summary.closing_balance.net_position', '-2000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        // Verify credit application event line exists with net_effect = 0.00
        $lines = $response->json('transactions.data');
        $creditAppLine = collect($lines)->firstWhere('type', 'credit_applied');
        $this->assertNotNull($creditAppLine);
        $this->assertSame('0.00', $creditAppLine['net_effect']);
        $this->assertSame('3000.00', $creditAppLine['amount']);
    }

    public function test_reversal_of_credit_allocation_restores_invoice_debt_and_credit(): void
    {
        $payment = $this->createPayment([
            'amount' => '5000.00',
            'allocated_amount' => '0.00',
            'unallocated_amount' => '5000.00',
            'paid_at' => Carbon::parse('2026-01-05 10:00:00', 'UTC'),
        ]);

        $inv = $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-10']);

        Carbon::setTestNow(Carbon::parse('2026-01-15 12:00:00', 'UTC'));
        $creditService = app(CompanyCreditService::class);
        $applyResult = $creditService->applyCredit($payment, [
            'idempotency_key' => 'idemp-rev-1',
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '3000.00'],
            ],
        ], $this->admin->id);

        $allocation = $applyResult['allocations'][0];

        // Reverse credit allocation on Jan 20
        Carbon::setTestNow(Carbon::parse('2026-01-20 12:00:00', 'UTC'));
        $creditService->reverseCreditAllocation($allocation, 'Customer requested change', $this->admin->id);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.closing_balance.receivables', '3000.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '5000.00')
            ->assertJsonPath('summary.closing_balance.net_position', '-2000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $lines = $response->json('transactions.data');
        $revLine = collect($lines)->firstWhere('type', 'allocation_reversed');
        $this->assertNotNull($revLine);
        $this->assertSame('3000.00', $revLine['amount']);
        $this->assertSame('0.00', $revLine['net_effect']);
    }

    public function test_full_payment_reversal_restores_receivables_and_cancels_credit(): void
    {
        $inv = $this->createInvoice(['total_amount' => '10000.00', 'issue_date' => '2026-01-05']);

        $payment = $this->createPayment([
            'amount' => '10000.00',
            'allocated_amount' => '10000.00',
            'unallocated_amount' => '0.00',
            'paid_at' => Carbon::parse('2026-01-10 10:00:00', 'UTC'),
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv->id,
            'amount' => '10000.00',
            'created_at' => $payment->paid_at,
        ]);
        app(InvoiceSettlementService::class)->recalculate($inv);

        // Reverse full payment on Jan 20
        $payment->update([
            'status' => PaymentStatus::REVERSED,
            'reversed_at' => Carbon::parse('2026-01-20 15:00:00', 'UTC'),
            'reversal_reason' => 'Cheque bounced by bank',
            'reversed_by' => $this->admin->id,
        ]);
        $payment->allocations()->update(['reversed_at' => Carbon::parse('2026-01-20 15:00:00', 'UTC'), 'reversal_reason' => 'Parent payment reversed']);
        app(InvoiceSettlementService::class)->recalculate($inv);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.closing_balance.receivables', '10000.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '10000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $lines = $response->json('transactions.data');
        $paymentRevLine = collect($lines)->firstWhere('type', 'payment_reversed');
        $this->assertNotNull($paymentRevLine);
        $this->assertSame('10000.00', $paymentRevLine['amount']);
        $this->assertSame('10000.00', $paymentRevLine['net_effect']);
    }

    public function test_invoice_cancellation_removes_receivable(): void
    {
        $inv = $this->createInvoice(['total_amount' => '2500.00', 'issue_date' => '2026-01-05']);

        // Cancel invoice on Jan 15 without auto-touching updated_at to now()
        Invoice::where('id', $inv->id)->update([
            'status' => InvoiceStatus::CANCELLED,
            'updated_at' => Carbon::parse('2026-01-15 12:00:00', 'UTC'),
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.closing_balance.receivables', '0.00')
            ->assertJsonPath('summary.closing_balance.net_position', '0.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $cancelLine = collect($response->json('transactions.data'))->firstWhere('type', 'invoice_cancelled');
        $this->assertNotNull($cancelLine);
        $this->assertSame('-2500.00', $cancelLine['net_effect']);
    }

    public function test_opening_balance_and_closing_balance_continuity_across_periods(): void
    {
        // 2025 Activity: Invoiced 10,000, Paid 6,000 => Ending net 4,000
        $inv2025 = $this->createInvoice([
            'total_amount' => '10000.00',
            'issue_date' => '2025-10-10',
        ]);
        $pay2025 = $this->createPayment([
            'amount' => '6000.00',
            'allocated_amount' => '6000.00',
            'unallocated_amount' => '0.00',
            'paid_at' => Carbon::parse('2025-11-15', 'UTC'),
        ]);
        PaymentAllocation::create([
            'payment_id' => $pay2025->id,
            'invoice_id' => $inv2025->id,
            'amount' => '6000.00',
            'created_at' => $pay2025->paid_at,
        ]);
        app(InvoiceSettlementService::class)->recalculate($inv2025);

        // 2026 Activity: New Invoice for 5,000
        $this->createInvoice([
            'total_amount' => '5000.00',
            'issue_date' => '2026-01-15',
        ]);

        // Request 2026 statement
        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-12-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.opening_balance.receivables', '4000.00')
            ->assertJsonPath('summary.opening_balance.unallocated_credit', '0.00')
            ->assertJsonPath('summary.opening_balance.net_position', '4000.00')
            ->assertJsonPath('summary.period_movements.invoiced_total', '5000.00')
            ->assertJsonPath('summary.period_movements.payments_received', '0.00')
            ->assertJsonPath('summary.closing_balance.receivables', '9000.00')
            ->assertJsonPath('summary.closing_balance.net_position', '9000.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        // Transactions should only show 2026 items (1 invoice)
        $lines = $response->json('transactions.data');
        $this->assertCount(1, $lines);
        $this->assertSame('9000.00', $lines[0]['running_balance']);
    }

    public function test_backdated_transactions_handled_safely(): void
    {
        $this->createInvoice(['total_amount' => '5000.00', 'issue_date' => '2026-01-10']);

        // Backdated payment received on Jan 03
        $this->createPayment([
            'amount' => '2000.00',
            'allocated_amount' => '0.00',
            'unallocated_amount' => '2000.00',
            'paid_at' => Carbon::parse('2026-01-03 10:00:00', 'UTC'),
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200);
        $lines = $response->json('transactions.data');
        $this->assertCount(2, $lines);

        // Payment should be first because Jan 03 < Jan 10
        $this->assertSame('payment_received', $lines[0]['type']);
        $this->assertSame('-2000.00', $lines[0]['running_balance']);

        // Invoice should be second
        $this->assertSame('invoice_issued', $lines[1]['type']);
        $this->assertSame('3000.00', $lines[1]['running_balance']);
    }

    public function test_date_range_boundaries_inclusive(): void
    {
        $this->createInvoice(['total_amount' => '1000.00', 'issue_date' => '2026-01-01']); // Boundary start
        $this->createInvoice(['total_amount' => '2000.00', 'issue_date' => '2026-01-15']); // Middle
        $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-31']); // Boundary end
        $this->createInvoice(['total_amount' => '4000.00', 'issue_date' => '2026-02-01']); // Outside period

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('summary.period_movements.invoiced_total', '6000.00')
            ->assertJsonPath('summary.closing_balance.receivables', '6000.00');

        $this->assertCount(3, $response->json('transactions.data'));
    }

    public function test_deterministic_transaction_ordering(): void
    {
        $exactTime = '2026-01-15 12:00:00';
        $inv = $this->createInvoice(['total_amount' => '1000.00', 'issue_date' => '2026-01-15', 'created_at' => $exactTime]);
        $pay = $this->createPayment(['amount' => '1000.00', 'paid_at' => Carbon::parse($exactTime, 'UTC')]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200);
        $lines = $response->json('transactions.data');
        $this->assertCount(2, $lines);

        // Priority 1 (invoice_issued) must precede Priority 2 (payment_received)
        $this->assertSame('invoice_issued', $lines[0]['type']);
        $this->assertSame('payment_received', $lines[1]['type']);
    }

    public function test_multi_currency_separation(): void
    {
        $this->createInvoice(['total_amount' => '1000.00', 'currency' => 'AED']);
        $this->createInvoice(['total_amount' => '500.00', 'currency' => 'USD']);
        $this->createPayment(['amount' => '250.00', 'currency' => 'USD']);

        // Check AED statement
        $resAed = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED");
        $resAed->assertStatus(200)
            ->assertJsonPath('currency', 'AED')
            ->assertJsonPath('summary.closing_balance.net_position', '1000.00');

        // Check USD statement
        $resUsd = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=USD");
        $resUsd->assertStatus(200)
            ->assertJsonPath('currency', 'USD')
            ->assertJsonPath('summary.closing_balance.net_position', '250.00');

        // Check Available Currencies endpoint
        $resCurr = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement/currencies");
        $resCurr->assertStatus(200)
            ->assertJsonFragment(['currencies' => ['AED', 'USD']]);
    }

    public function test_three_decimal_currencies_precision(): void
    {
        $inv = $this->createInvoice([
            'total_amount' => '1500.250',
            'currency' => 'KWD',
            'issue_date' => '2026-01-05',
        ]);

        $payment = $this->createPayment([
            'amount' => '1000.125',
            'allocated_amount' => '1000.125',
            'unallocated_amount' => '0.000',
            'currency' => 'KWD',
            'paid_at' => Carbon::parse('2026-01-10', 'UTC'),
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'invoice_id' => $inv->id,
            'amount' => '1000.125',
            'created_at' => $payment->paid_at,
        ]);
        app(InvoiceSettlementService::class)->recalculate($inv);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=KWD&start_date=2026-01-01&end_date=2026-01-31");

        $response->assertStatus(200)
            ->assertJsonPath('currency', 'KWD')
            ->assertJsonPath('summary.period_movements.invoiced_total', '1500.250')
            ->assertJsonPath('summary.period_movements.payments_received', '1000.125')
            ->assertJsonPath('summary.closing_balance.receivables', '500.125')
            ->assertJsonPath('summary.closing_balance.net_position', '500.125')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);
    }

    public function test_pagination_independent_totals(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $day = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $this->createInvoice(['total_amount' => '100.00', 'issue_date' => "2026-01-{$day}"]);
        }

        // Request page 1 with per_page 3
        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31&per_page=3&page=1");

        $response->assertStatus(200)
            ->assertJsonPath('summary.period_movements.invoiced_total', '1000.00')
            ->assertJsonPath('summary.closing_balance.net_position', '1000.00')
            ->assertJsonPath('transactions.meta.total', 10)
            ->assertJsonPath('transactions.meta.per_page', 3)
            ->assertJsonPath('transactions.meta.current_page', 1);

        $this->assertCount(3, $response->json('transactions.data'));
    }

    public function test_authorization_and_tenant_isolation(): void
    {
        // 1. Unauthenticated request rejected
        $this->getJson("/api/v1/companies/{$this->company->id}/statement")
            ->assertStatus(401);

        // 2. Client user of Company A accessing Company A statement accepted
        $this->actingAs($this->clientUser)->getJson("/api/v1/companies/{$this->company->id}/statement")
            ->assertStatus(200);

        // 3. Client user of Company A accessing Company B statement rejected with 403
        $this->actingAs($this->clientUser)->getJson("/api/v1/companies/{$this->otherCompany->id}/statement")
            ->assertStatus(403);

        // 4. Staff employee accessing statement accepted
        $this->actingAs($this->employee)->getJson("/api/v1/companies/{$this->company->id}/statement")
            ->assertStatus(200);
    }

    public function test_authentic_booking_references_extracted_from_invoice_items(): void
    {
        $this->createInvoice([
            'total_amount' => '3000.00',
            'booking_reference' => 'BK-LEGENDARY-7788',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED");

        $response->assertStatus(200);
        $lines = $response->json('transactions.data');
        $this->assertCount(1, $lines);
        $this->assertSame(['BK-LEGENDARY-7788'], $lines[0]['booking_references']);

        $activeInvoices = $response->json('active_invoices_breakdown');
        $this->assertCount(1, $activeInvoices);
        $this->assertSame(['BK-LEGENDARY-7788'], $activeInvoices[0]['booking_references']);

        $this->assertSame('embedded_line_item_references', $response->json('booking_integration.status'));
    }

    public function test_idempotency_concurrent_guard_on_credit_application(): void
    {
        $payment1 = $this->createPayment(['amount' => '5000.00', 'allocated_amount' => '0.00']);
        $payment2 = $this->createPayment(['amount' => '5000.00', 'allocated_amount' => '0.00']);
        $inv = $this->createInvoice(['total_amount' => '2000.00']);

        $creditService = app(CompanyCreditService::class);
        $idempKey = 'idemp-test-shared-key-1';

        // Apply on payment 1
        $creditService->applyCredit($payment1, [
            'idempotency_key' => $idempKey,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '2000.00'],
            ],
        ], $this->admin->id);

        // Trying to use same idempotency key on payment 2 must be rejected
        $this->expectException(ValidationException::class);
        $creditService->applyCredit($payment2, [
            'idempotency_key' => $idempKey,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '2000.00'],
            ],
        ], $this->admin->id);
    }

    public function test_transaction_type_filter_does_not_corrupt_summary_or_running_balances(): void
    {
        $this->createInvoice(['total_amount' => '2000.00', 'issue_date' => '2026-01-05']);
        $this->createInvoice(['total_amount' => '3000.00', 'issue_date' => '2026-01-08']);
        $this->createPayment([
            'amount' => '1500.00',
            'allocated_amount' => '0.00',
            'paid_at' => Carbon::parse('2026-01-12 10:00:00', 'UTC'),
        ]);

        // Filter: invoices only
        $resInvoices = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31&type=invoices");
        $resInvoices->assertStatus(200);

        // Summary must preserve complete financial truth
        $resInvoices->assertJsonPath('summary.period_movements.invoiced_total', '5000.00')
            ->assertJsonPath('summary.period_movements.payments_received', '1500.00')
            ->assertJsonPath('summary.closing_balance.receivables', '5000.00')
            ->assertJsonPath('summary.closing_balance.unallocated_credit', '1500.00')
            ->assertJsonPath('summary.closing_balance.net_position', '3500.00')
            ->assertJsonPath('summary.reconciliation.is_reconciled', true);

        $invLines = $resInvoices->json('transactions.data');
        $this->assertCount(2, $invLines);
        $this->assertSame('2000.00', $invLines[0]['running_balance']);
        $this->assertSame('5000.00', $invLines[1]['running_balance']);

        // Filter: payments only
        $resPayments = $this->actingAs($this->admin)->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31&type=payments");
        $resPayments->assertStatus(200);

        // Summary remains unchanged
        $resPayments->assertJsonPath('summary.period_movements.invoiced_total', '5000.00')
            ->assertJsonPath('summary.period_movements.payments_received', '1500.00')
            ->assertJsonPath('summary.closing_balance.net_position', '3500.00');

        $payLines = $resPayments->json('transactions.data');
        $this->assertCount(1, $payLines);
        $this->assertSame('3500.00', $payLines[0]['running_balance']);
    }

    public function test_print_endpoint_returns_html_statement(): void
    {
        $this->createInvoice(['total_amount' => '3500.00', 'issue_date' => '2026-01-05']);

        $res = $this->actingAs($this->admin)->get("/api/v1/companies/{$this->company->id}/statement/print?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $content = $res->getContent();
        $this->assertStringContainsString('STATEMENT OF ACCOUNT', $content);
        $this->assertStringContainsString($this->company->name, $content);
        $this->assertStringContainsString('3,500.00', $content);
    }

    public function test_download_pdf_endpoint_returns_valid_pdf_file(): void
    {
        $this->createInvoice(['total_amount' => '4200.00', 'issue_date' => '2026-01-08']);

        $res = $this->actingAs($this->admin)->get("/api/v1/companies/{$this->company->id}/statement/pdf?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_download_excel_endpoint_returns_valid_xlsx_file(): void
    {
        $invoice = $this->createInvoice(['total_amount' => '1750.00', 'issue_date' => '2026-01-10']);

        $statement = $this->actingAs($this->admin)
            ->getJson("/api/v1/companies/{$this->company->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31&all=1")
            ->assertOk()
            ->json();

        $res = $this->actingAs($this->admin)->get("/api/v1/companies/{$this->company->id}/statement/excel?currency=AED&start_date=2026-01-01&end_date=2026-01-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // XLSX is a ZIP archive starting with PK\x03\x04
        $this->assertStringStartsWith("PK\x03\x04", $res->getContent());

        $sheet = $this->xlsxSheetXml($res->getContent());
        $this->assertStringContainsString(htmlspecialchars($this->company->name, ENT_XML1), $sheet);
        $this->assertStringContainsString($invoice->reference, $sheet);
        $this->assertStringContainsString('Currency: AED', $sheet);
        $this->assertStringContainsString(
            '<v>' . (float) $statement['summary']['closing_balance']['net_position'] . '</v>',
            $sheet
        );
    }

    private function xlsxSheetXml(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'company_statement_test_');
        file_put_contents($path, $content);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($path);

        $this->assertIsString($sheet);

        return $sheet;
    }
}

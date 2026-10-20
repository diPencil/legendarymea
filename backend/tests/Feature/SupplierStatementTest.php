<?php

namespace Tests\Feature;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\SupplierLedgerDirection;
use App\Enums\SupplierLedgerType;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\SupplierLedgerEntry;
use App\Models\User;
use App\Services\InvoiceLifecycleService;
use App\Services\SupplierLedgerService;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class SupplierStatementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $viewer;
    protected User $noAccess;
    protected User $clientUser;
    protected Company $company;
    protected Employee $salesEmployee;
    protected SupplierLedgerService $ledgerService;
    protected InvoiceLifecycleService $invoiceLifecycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('employee');
        $this->viewer->givePermissionTo('view_suppliers');

        $this->noAccess = User::factory()->create();

        $this->company = Company::factory()->create();
        $this->clientUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->clientUser->assignRole('client');

        $this->salesEmployee = Employee::factory()->create([
            'user_id' => User::factory()->create()->id,
            'department' => 'Sales',
            'status' => 'active',
            'is_sales_eligible' => true,
        ]);

        $this->ledgerService = app(SupplierLedgerService::class);
        $this->invoiceLifecycle = app(InvoiceLifecycleService::class);
    }

    private function createSupplier(string $name = 'Marriott Hotels Group'): Supplier
    {
        return Supplier::create([
            'reference' => 'LM-SUP-CO-' . str_pad((string) rand(1, 99999), 5, '0', STR_PAD_LEFT),
            'type' => 'company',
            'name' => $name,
            'email' => 'finance@supplier.com',
            'mobile' => '+971501234567',
            'address' => 'Dubai Marina, UAE',
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_supplier_with_no_activity_returns_balanced_zero_summary(): void
    {
        $supplier = $this->createSupplier();

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED")
            ->assertOk();

        $json = $response->json();

        $this->assertSame($supplier->id, $json['supplier']['id']);
        $this->assertSame('AED', $json['currency']);
        $this->assertSame('0.00', $json['summary']['opening_balance']['balance']);
        $this->assertSame('0.00', $json['summary']['opening_balance']['available_funds']);
        $this->assertSame('0.00', $json['summary']['opening_balance']['amount_owed']);
        $this->assertSame('0.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('0.00', $json['summary']['period_movements']['usage_total']);
        $this->assertSame('0.00', $json['summary']['period_movements']['net_movement']);
        $this->assertSame('0.00', $json['summary']['closing_balance']['balance']);
        $this->assertSame('0.00', $json['summary']['closing_balance']['available_funds']);
        $this->assertSame('0.00', $json['summary']['closing_balance']['amount_owed']);
        $this->assertSame('settled', $json['summary']['closing_balance']['position_status']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);
        $this->assertFalse($json['summary']['reconciliation']['discrepancy_detected']);
        $this->assertEmpty($json['transactions']['data']);
        $this->assertSame(0, $json['transactions']['total']);
    }

    public function test_deposits_before_and_during_statement_period(): void
    {
        $supplier = $this->createSupplier();

        // 1. Prior deposit before statement period (January)
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-01-15',
            'payment_method' => PaymentMethod::BANK_TRANSFER->value,
            'external_reference' => 'WIRE-JAN-01',
            'notes' => 'January opening float',
        ], $this->admin->id);

        // 2. Deposit during statement period (February)
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-02-10',
            'payment_method' => PaymentMethod::BANK_TRANSFER->value,
            'external_reference' => 'WIRE-FEB-01',
            'notes' => 'February mid-month deposit',
        ], $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-02-01&end_date=2026-02-28")
            ->assertOk();

        $json = $response->json();

        // Opening balance should equal exactly January's deposit
        $this->assertSame('1000.00', $json['summary']['opening_balance']['balance']);
        $this->assertSame('1000.00', $json['summary']['opening_balance']['available_funds']);
        $this->assertSame('0.00', $json['summary']['opening_balance']['amount_owed']);

        // Period movements
        $this->assertSame('500.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('500.00', $json['summary']['period_movements']['net_movement']);

        // Closing balance = 1000 + 500 = 1500
        $this->assertSame('1500.00', $json['summary']['closing_balance']['balance']);
        $this->assertSame('1500.00', $json['summary']['closing_balance']['available_funds']);
        $this->assertSame('in_funds', $json['summary']['closing_balance']['position_status']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);

        // Transaction list contains only February entry
        $this->assertCount(1, $json['transactions']['data']);
        $this->assertSame('LM-SUPLED-', substr($json['transactions']['data'][0]['reference'], 0, 10));
        $this->assertSame('500.00', $json['transactions']['data'][0]['amount']);
        $this->assertSame('1500.00', $json['transactions']['data'][0]['running_balance']);
        $this->assertSame('credit', $json['transactions']['data'][0]['direction']);
    }

    public function test_invoice_usage_from_multiple_invoice_items(): void
    {
        $supplier = $this->createSupplier();

        // Initial deposit: 5,000 AED
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '5000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-03-01',
            'payment_method' => PaymentMethod::BANK_TRANSFER->value,
        ], $this->admin->id);

        // Create draft invoice with 2 items using this supplier
        $invoice = Invoice::create([
            'reference' => 'LM-INV-2026-000100',
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '3000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '3000.00',
            'supplier_total_cost' => '2200.00',
            'gross_profit' => '800.00',
            'gross_margin' => '26.67',
            'issue_date' => '2026-03-15',
            'created_by' => $this->admin->id,
        ]);

        $item1 = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Luxury Suite Hotel Stay 3 Nights',
            'service_type' => 'hotel',
            'service_name_snapshot' => 'Deluxe Room',
            'booking_reference' => 'BK-HOTEL-99881',
            'supplier_id' => $supplier->id,
            'quantity' => '3.000',
            'unit_price' => '600.000',
            'purchase_unit_cost' => '400.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '400.000',
            'line_total' => '1800.000',
            'converted_line_cost' => '1200.000',
            'line_profit' => '600.000',
            'line_margin' => '33.3300',
            'sort_order' => 1,
        ]);

        $item2 = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Airport VIP Chauffeur Transfer',
            'service_type' => 'transfer',
            'service_name_snapshot' => 'Mercedes S-Class Transfer',
            'booking_reference' => 'BK-TRANS-44210',
            'supplier_id' => $supplier->id,
            'quantity' => '2.000',
            'unit_price' => '600.000',
            'purchase_unit_cost' => '500.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '500.000',
            'line_total' => '1200.000',
            'converted_line_cost' => '1000.000',
            'line_profit' => '200.000',
            'line_margin' => '16.6700',
            'sort_order' => 2,
        ]);

        // Issue invoice -> triggers consumeForInvoice
        $this->invoiceLifecycle->issue($invoice, $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-03-01&end_date=2026-03-31")
            ->assertOk();

        $json = $response->json();

        // Funding: 5,000, Usage: 1,200 + 1,000 = 2,200
        $this->assertSame('5000.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('2200.00', $json['summary']['period_movements']['usage_total']);
        $this->assertSame('2800.00', $json['summary']['period_movements']['net_movement']);
        $this->assertSame('2800.00', $json['summary']['closing_balance']['balance']);
        $this->assertSame('2800.00', $json['summary']['closing_balance']['available_funds']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);

        // Check transaction rows
        $this->assertCount(3, $json['transactions']['data']); // 1 deposit + 2 usage items

        // Check authentic booking references
        $bookingRefs = array_filter(array_column($json['transactions']['data'], 'booking_reference'));
        $this->assertContains('BK-HOTEL-99881', $bookingRefs);
        $this->assertContains('BK-TRANS-44210', $bookingRefs);

        // Check supporting schedules
        $usageSchedule = $json['supporting_schedules']['invoice_usage_schedule'];
        $this->assertCount(2, $usageSchedule);
        $this->assertSame('BK-HOTEL-99881', $usageSchedule[0]['booking_reference']);
        $this->assertSame('1200.00', $usageSchedule[0]['total_cost']);
        $this->assertSame('BK-TRANS-44210', $usageSchedule[1]['booking_reference']);
        $this->assertSame('1000.00', $usageSchedule[1]['total_cost']);
    }

    public function test_usage_reversals_restore_balance(): void
    {
        $supplier = $this->createSupplier();

        // 1. Initial Deposit 2,000
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '2000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-04-01',
        ], $this->admin->id);

        // 2. Invoice with cost 1,500
        $invoice = Invoice::create([
            'reference' => 'LM-INV-2026-000200',
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '2000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '2000.00',
            'supplier_total_cost' => '1500.00',
            'gross_profit' => '500.00',
            'gross_margin' => '25.00',
            'issue_date' => '2026-04-05',
            'created_by' => $this->admin->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Tour Service',
            'booking_reference' => 'BK-TOUR-12345',
            'supplier_id' => $supplier->id,
            'quantity' => '1.000',
            'unit_price' => '2000.000',
            'purchase_unit_cost' => '1500.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '1500.000',
            'line_total' => '2000.000',
            'converted_line_cost' => '1500.000',
            'line_profit' => '500.000',
            'line_margin' => '25.0000',
            'sort_order' => 1,
        ]);

        $this->invoiceLifecycle->issue($invoice, $this->admin->id);

        // 3. Reverse invoice supplier usage on 2026-04-10
        $this->ledgerService->reverseForInvoice($invoice, $this->admin->id, 'Trip cancelled by customer', '2026-04-10');

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-04-01&end_date=2026-04-30")
            ->assertOk();

        $json = $response->json();

        // Funding: 2000, Usage: 1500, Reversals: 1500 -> Net Movement = 2000 - 1500 + 1500 = 2000
        $this->assertSame('2000.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('1500.00', $json['summary']['period_movements']['usage_total']);
        $this->assertSame('1500.00', $json['summary']['period_movements']['reversals_total']);
        $this->assertSame('2000.00', $json['summary']['period_movements']['net_movement']);
        $this->assertSame('2000.00', $json['summary']['closing_balance']['balance']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);

        // Check reversal linkages in transaction ledger
        $txs = $json['transactions']['data'];
        $this->assertCount(3, $txs); // Funding, Usage, Reversal
        $usageTx = collect($txs)->firstWhere('type', 'invoice_usage');
        $reversalTx = collect($txs)->firstWhere('type', 'reversal');

        $this->assertTrue($usageTx['is_reversed']);
        $this->assertSame($reversalTx['reference'], $usageTx['reversal_reference']);
        $this->assertSame($usageTx['id'], $reversalTx['reversal_of_id']);
        $this->assertSame($usageTx['reference'], $reversalTx['reversal_of_reference']);
    }

    public function test_positive_and_negative_balance_adjustments(): void
    {
        $supplier = $this->createSupplier();

        // 1. Initial Deposit 1,000
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-01',
        ], $this->admin->id);

        // 2. Positive adjustment +250 (Credit rebate)
        $this->ledgerService->adjustBalance($supplier, [
            'amount' => '250.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-10',
            'reason' => 'Quarterly volume rebate',
        ], $this->admin->id);

        // 3. Negative adjustment -100 (Debit fee)
        $this->ledgerService->adjustBalance($supplier, [
            'amount' => '-100.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-15',
            'reason' => 'Annual API maintenance fee',
        ], $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-05-01&end_date=2026-05-31")
            ->assertOk();

        $json = $response->json();

        // Movements:
        // Funding: 1000
        // Adjustments Credit: 250, Debit: 100 -> Net Adjustments: 150
        // Net Movement = 1000 + 150 = 1150
        $this->assertSame('1000.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('250.00', $json['summary']['period_movements']['adjustments_credit']);
        $this->assertSame('100.00', $json['summary']['period_movements']['adjustments_debit']);
        $this->assertSame('150.00', $json['summary']['period_movements']['net_adjustments']);
        $this->assertSame('1150.00', $json['summary']['period_movements']['net_movement']);
        $this->assertSame('1150.00', $json['summary']['closing_balance']['balance']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);
    }

    public function test_amount_owed_when_usage_exceeds_deposit(): void
    {
        $supplier = $this->createSupplier();

        // Initial deposit: 500 AED
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-06-01',
        ], $this->admin->id);

        // Invoice usage: 1,200 AED (exceeding deposit by 700 AED)
        $invoice = Invoice::create([
            'reference' => 'LM-INV-2026-000300',
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '1500.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '1500.00',
            'supplier_total_cost' => '1200.00',
            'gross_profit' => '300.00',
            'gross_margin' => '20.00',
            'issue_date' => '2026-06-10',
            'created_by' => $this->admin->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Excursion package',
            'supplier_id' => $supplier->id,
            'quantity' => '1.000',
            'unit_price' => '1500.000',
            'purchase_unit_cost' => '1200.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '1200.000',
            'line_total' => '1500.000',
            'converted_line_cost' => '1200.000',
            'line_profit' => '300.000',
            'line_margin' => '20.0000',
            'sort_order' => 1,
        ]);

        $this->invoiceLifecycle->issue($invoice, $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-06-01&end_date=2026-06-30")
            ->assertOk();

        $json = $response->json();

        // Balance: 500 - 1200 = -700.00
        $this->assertSame('-700.00', $json['summary']['closing_balance']['balance']);
        $this->assertSame('0.00', $json['summary']['closing_balance']['available_funds']);
        $this->assertSame('700.00', $json['summary']['closing_balance']['amount_owed']);
        $this->assertSame('owing', $json['summary']['closing_balance']['position_status']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);
    }

    public function test_currency_separation(): void
    {
        $supplier = $this->createSupplier();

        // 1. AED Deposit 1,000
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-07-01',
        ], $this->admin->id);

        // 2. USD Deposit 500
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'USD',
            'transaction_date' => '2026-07-02',
        ], $this->admin->id);

        // Verify available currencies endpoint
        $currResponse = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement/currencies")
            ->assertOk();

        $currencies = $currResponse->json('currencies');
        $this->assertContains('AED', $currencies);
        $this->assertContains('USD', $currencies);

        // Request AED statement -> must NOT include USD deposit
        $aedStmt = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED")
            ->assertOk()
            ->json();

        $this->assertSame('1000.00', $aedStmt['summary']['closing_balance']['balance']);
        $this->assertCount(1, $aedStmt['transactions']['data']);
        $this->assertSame('1000.00', $aedStmt['transactions']['data'][0]['amount']);

        // Request USD statement -> must NOT include AED deposit
        $usdStmt = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=USD")
            ->assertOk()
            ->json();

        $this->assertSame('500.00', $usdStmt['summary']['closing_balance']['balance']);
        $this->assertCount(1, $usdStmt['transactions']['data']);
        $this->assertSame('500.00', $usdStmt['transactions']['data'][0]['amount']);
    }

    public function test_three_decimal_precision_currencies(): void
    {
        $supplier = $this->createSupplier();

        // Deposit 12.345 KWD
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '12.345',
            'currency' => 'KWD',
            'transaction_date' => '2026-08-01',
        ], $this->admin->id);

        // Adjustment -2.100 KWD
        $this->ledgerService->adjustBalance($supplier, [
            'amount' => '-2.100',
            'currency' => 'KWD',
            'transaction_date' => '2026-08-05',
            'reason' => 'Service fee',
        ], $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=KWD")
            ->assertOk();

        $json = $response->json();

        // Balance = 12.345 - 2.100 = 10.245 KWD
        $this->assertSame('10.245', $json['summary']['closing_balance']['balance']);
        $this->assertSame('10.245', $json['summary']['closing_balance']['available_funds']);
        $this->assertSame('12.345', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('2.100', $json['summary']['period_movements']['adjustments_debit']);
        $this->assertSame('-2.100', $json['summary']['period_movements']['net_adjustments']);
        $this->assertSame('10.245', $json['summary']['period_movements']['net_movement']);
        $this->assertTrue($json['summary']['reconciliation']['is_reconciled']);
    }

    public function test_reconciliation_discrepancy_detection(): void
    {
        $supplier = $this->createSupplier();

        // Record a genuine deposit of 1,000 AED
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-09-01',
        ], $this->admin->id);

        // Manually tamper with supplier_balance_accounts current_balance to simulate data corruption
        SupplierBalanceAccount::where('supplier_id', $supplier->id)
            ->where('currency', 'AED')
            ->update(['current_balance' => '1200.00']);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED")
            ->assertOk();

        $json = $response->json();

        $recon = $json['summary']['reconciliation'];
        $this->assertFalse($recon['is_reconciled']);
        $this->assertTrue($recon['discrepancy_detected']);
        $this->assertSame('1000.00', $recon['all_time_ledger_balance']);
        $this->assertSame('1200.00', $recon['account_current_balance']);
        $this->assertSame('200.00', $recon['discrepancy']);
    }

    public function test_pagination_independent_totals(): void
    {
        $supplier = $this->createSupplier();

        // Create 5 separate funding transactions of 100 AED each = 500 AED
        for ($i = 1; $i <= 5; $i++) {
            $this->ledgerService->fundBalance($supplier, [
                'amount' => '100.00',
                'currency' => 'AED',
                'transaction_date' => "2026-10-0{$i}",
            ], $this->admin->id);
        }

        // Request page 1 with per_page = 2
        $page1 = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&per_page=2&page=1")
            ->assertOk()
            ->json();

        // Request page 2 with per_page = 2
        $page2 = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&per_page=2&page=2")
            ->assertOk()
            ->json();

        // Summaries must be identical across both pages!
        $this->assertSame('500.00', $page1['summary']['closing_balance']['balance']);
        $this->assertSame('500.00', $page2['summary']['closing_balance']['balance']);
        $this->assertSame('500.00', $page1['summary']['period_movements']['funding_total']);
        $this->assertSame('500.00', $page2['summary']['period_movements']['funding_total']);

        // Data rows must be sliced
        $this->assertCount(2, $page1['transactions']['data']);
        $this->assertCount(2, $page2['transactions']['data']);
        $this->assertSame(5, $page1['transactions']['total']);
        $this->assertSame(5, $page2['transactions']['total']);
        $this->assertNotSame($page1['transactions']['data'][0]['id'], $page2['transactions']['data'][0]['id']);
    }

    public function test_transaction_type_filter_preserves_running_balances_and_totals(): void
    {
        $supplier = $this->createSupplier();

        // 1. Funding: 2,000 AED
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '2000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-10-01',
        ], $this->admin->id);

        // 2. Adjustment: +500 AED
        $this->ledgerService->adjustBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-10-05',
            'reason' => 'Rebate',
        ], $this->admin->id);

        // Filter only adjustments
        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&type=adjustments")
            ->assertOk();

        $json = $response->json();

        // Overall summary still reflects both transactions: 2,000 + 500 = 2,500
        $this->assertSame('2500.00', $json['summary']['closing_balance']['balance']);
        $this->assertSame('2000.00', $json['summary']['period_movements']['funding_total']);
        $this->assertSame('500.00', $json['summary']['period_movements']['adjustments_credit']);

        // But transactions data list only displays the adjustment row
        $this->assertCount(1, $json['transactions']['data']);
        $this->assertSame('adjustment', $json['transactions']['data'][0]['type']);
        $this->assertSame('2500.00', $json['transactions']['data'][0]['running_balance']);
    }

    public function test_authorization_enforced(): void
    {
        $supplier = $this->createSupplier();

        // 1. Unauthenticated -> 401
        $this->getJson("/api/v1/suppliers/{$supplier->id}/statement")
            ->assertUnauthorized();

        // 2. Client Portal User -> 403 Forbidden
        $this->actingAs($this->clientUser)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement")
            ->assertForbidden();

        // 3. User without permission -> 403 Forbidden
        $this->actingAs($this->noAccess)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement")
            ->assertForbidden();

        // 4. User with view_suppliers -> 200 OK
        $this->actingAs($this->viewer)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement")
            ->assertOk();

        // 5. Admin -> 200 OK
        $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement")
            ->assertOk();
    }

    public function test_opening_and_closing_continuity_across_consecutive_periods(): void
    {
        $supplier = $this->createSupplier();

        // Month 1 (January): Deposit 3,000, Usage 1,000 -> Closing = 2,000
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '3000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-01-05',
        ], $this->admin->id);

        $invoice1 = Invoice::create([
            'reference' => 'LM-INV-2026-000401',
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '1500.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '1500.00',
            'supplier_total_cost' => '1000.00',
            'gross_profit' => '500.00',
            'gross_margin' => '33.33',
            'issue_date' => '2026-01-20',
            'created_by' => $this->admin->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice1->id,
            'description' => 'Month 1 Item',
            'supplier_id' => $supplier->id,
            'quantity' => '1.000',
            'unit_price' => '1500.000',
            'purchase_unit_cost' => '1000.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '1000.000',
            'line_total' => '1500.000',
            'converted_line_cost' => '1000.000',
            'line_profit' => '500.000',
            'line_margin' => '33.3300',
            'sort_order' => 1,
        ]);

        $this->invoiceLifecycle->issue($invoice1, $this->admin->id);

        // Month 2 (February): Deposit 500, Adjustment +100 -> Net Movement = +600 -> Closing = 2,600
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-02-10',
        ], $this->admin->id);

        $this->ledgerService->adjustBalance($supplier, [
            'amount' => '100.00',
            'currency' => 'AED',
            'transaction_date' => '2026-02-15',
            'reason' => 'Bonus credit',
        ], $this->admin->id);

        // Fetch Period 1 (January)
        $p1 = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-01-01&end_date=2026-01-31")
            ->assertOk()
            ->json();

        // Fetch Period 2 (February)
        $p2 = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-02-01&end_date=2026-02-28")
            ->assertOk()
            ->json();

        // Verification: Period 1 Closing MUST equal Period 2 Opening!
        $p1Closing = $p1['summary']['closing_balance']['balance'];
        $p2Opening = $p2['summary']['opening_balance']['balance'];

        $this->assertSame('2000.00', $p1Closing);
        $this->assertSame('2000.00', $p2Opening);
        $this->assertSame($p1Closing, $p2Opening);

        // Period 2 Closing = 2000 + 600 = 2600
        $this->assertSame('2600.00', $p2['summary']['closing_balance']['balance']);
    }

    public function test_backdated_transactions_handled_with_deterministic_ordering(): void
    {
        $supplier = $this->createSupplier();

        // 1. Transaction entered first, but with future date 2026-03-20
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-03-20',
        ], $this->admin->id);

        // 2. Transaction entered second, but backdated to 2026-03-05
        $this->ledgerService->fundBalance($supplier, [
            'amount' => '500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-03-05',
        ], $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-03-01&end_date=2026-03-31")
            ->assertOk();

        $txs = $response->json('transactions.data');
        $this->assertCount(2, $txs);

        // First row must be the 2026-03-05 transaction (500 AED, running balance 500)
        $this->assertSame('2026-03-05', $txs[0]['date']);
        $this->assertSame('500.00', $txs[0]['amount']);
        $this->assertSame('500.00', $txs[0]['running_balance']);

        // Second row must be the 2026-03-20 transaction (1000 AED, running balance 1500)
        $this->assertSame('2026-03-20', $txs[1]['date']);
        $this->assertSame('1000.00', $txs[1]['amount']);
        $this->assertSame('1500.00', $txs[1]['running_balance']);
    }

    public function test_duplicate_invoice_usage_prevented(): void
    {
        $supplier = $this->createSupplier();

        $this->ledgerService->fundBalance($supplier, [
            'amount' => '2000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-04-01',
        ], $this->admin->id);

        $invoice = Invoice::create([
            'reference' => 'LM-INV-2026-000501',
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '1000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '1000.00',
            'supplier_total_cost' => '600.00',
            'gross_profit' => '400.00',
            'gross_margin' => '40.00',
            'issue_date' => '2026-04-10',
            'created_by' => $this->admin->id,
        ]);

        $item = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Service item',
            'supplier_id' => $supplier->id,
            'quantity' => '1.000',
            'unit_price' => '1000.000',
            'purchase_unit_cost' => '600.000',
            'purchase_currency' => 'AED',
            'exchange_rate' => '1.00000000',
            'converted_unit_cost' => '600.000',
            'line_total' => '1000.000',
            'converted_line_cost' => '600.000',
            'line_profit' => '400.000',
            'line_margin' => '40.0000',
            'sort_order' => 1,
        ]);

        // Issue invoice
        $this->invoiceLifecycle->issue($invoice, $this->admin->id);

        // Calling consumeForInvoice a second time must NOT create duplicate deductions
        $this->ledgerService->consumeForInvoice($invoice, $this->admin->id);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-04-01&end_date=2026-04-30")
            ->assertOk();

        $json = $response->json();

        // Exactly 600.00 deducted once (not 1200.00)
        $this->assertSame('600.00', $json['summary']['period_movements']['usage_total']);
        $this->assertSame('1400.00', $json['summary']['closing_balance']['balance']);
        $this->assertCount(2, $json['transactions']['data']); // 1 funding + 1 usage
    }

    public function test_unpaginated_export_support_with_all_flag(): void
    {
        $supplier = $this->createSupplier();

        // Create 15 funding transactions
        for ($i = 1; $i <= 15; $i++) {
            $day = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $this->ledgerService->fundBalance($supplier, [
                'amount' => '50.00',
                'currency' => 'AED',
                'transaction_date' => "2026-05-{$day}",
            ], $this->admin->id);
        }

        // Standard request with default per_page (e.g. per_page=5)
        $paginated = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&per_page=5&page=1")
            ->assertOk()
            ->json();

        $this->assertCount(5, $paginated['transactions']['data']);
        $this->assertSame(15, $paginated['transactions']['total']);
        $this->assertSame(3, $paginated['transactions']['last_page']);

        // Request with all=1 (used for PDF/Excel exports)
        $unpaginated = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&all=1")
            ->assertOk()
            ->json();

        $this->assertCount(15, $unpaginated['transactions']['data']);
        $this->assertSame(15, $unpaginated['transactions']['total']);
        $this->assertSame(1, $unpaginated['transactions']['last_page']);
        $this->assertSame('750.00', $unpaginated['summary']['closing_balance']['balance']);
    }

    public function test_print_endpoint_returns_html_statement(): void
    {
        $supplier = $this->createSupplier('Emirates Palace Hotel');

        $this->ledgerService->fundBalance($supplier, [
            'amount' => '3500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-01',
            'external_reference' => 'WIRE-998811',
            'notes' => 'Advance deposit for VIP bookings',
        ], $this->admin->id);

        $res = $this->actingAs($this->admin)->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED&start_date=2026-05-01&end_date=2026-05-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $content = $res->getContent();
        $this->assertStringContainsString('SUPPLIER STATEMENT OF ACCOUNT', $content);
        $this->assertStringContainsString('Emirates Palace Hotel', $content);
        $this->assertStringContainsString('3,500.00', $content);
        $this->assertStringContainsString('WIRE-998811', $content);
        $this->assertStringContainsString('Reconciled with Ledger', $content);
    }

    public function test_print_endpoint_supports_arabic_locale(): void
    {
        $supplier = $this->createSupplier('مجموعة فنادق ماريوت');

        $this->ledgerService->fundBalance($supplier, [
            'amount' => '1200.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-01',
        ], $this->admin->id);

        $res = $this->actingAs($this->admin)->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED&locale=ar");

        $res->assertStatus(200);
        $content = $res->getContent();
        $this->assertStringContainsString('dir="rtl"', $content);
        $this->assertStringContainsString('كشف حساب مورد', $content);
        $this->assertStringContainsString('الرصيد الافتتاحي', $content);
        $this->assertStringContainsString('مجموعة فنادق ماريوت', $content);
    }

    public function test_download_pdf_endpoint_returns_valid_pdf_file(): void
    {
        $supplier = $this->createSupplier('Four Seasons Luxury Resorts');

        $this->ledgerService->fundBalance($supplier, [
            'amount' => '5000.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-02',
        ], $this->admin->id);

        $res = $this->actingAs($this->admin)->get("/api/v1/suppliers/{$supplier->id}/statement/pdf?currency=AED&start_date=2026-05-01&end_date=2026-05-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_download_excel_endpoint_returns_valid_xlsx_file(): void
    {
        $supplier = $this->createSupplier('Armani Hotel Dubai');

        $this->ledgerService->fundBalance($supplier, [
            'amount' => '8500.00',
            'currency' => 'AED',
            'transaction_date' => '2026-05-05',
        ], $this->admin->id);

        $statement = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement?currency=AED&start_date=2026-05-01&end_date=2026-05-31&all=1")
            ->assertOk()
            ->json();

        $res = $this->actingAs($this->admin)->get("/api/v1/suppliers/{$supplier->id}/statement/excel?currency=AED&start_date=2026-05-01&end_date=2026-05-31");

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringStartsWith("PK\x03\x04", $res->getContent());

        $sheet = $this->xlsxSheetXml($res->getContent());
        $this->assertStringContainsString(htmlspecialchars($supplier->name, ENT_XML1), $sheet);
        $this->assertStringContainsString($statement['transactions']['data'][0]['reference'], $sheet);
        $this->assertStringContainsString('Currency: AED', $sheet);
        $this->assertStringContainsString(
            '<v>' . (float) $statement['summary']['closing_balance']['balance'] . '</v>',
            $sheet
        );
    }

    private function xlsxSheetXml(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'supplier_statement_test_');
        file_put_contents($path, $content);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($path);

        $this->assertIsString($sheet);

        return $sheet;
    }

    public function test_export_endpoints_authorization_rejects_client_and_unauthorized_users(): void
    {
        $supplier = $this->createSupplier();

        // 1. Unauthenticated users cannot access exports
        $this->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED")->assertStatus(401);
        $this->get("/api/v1/suppliers/{$supplier->id}/statement/pdf?currency=AED")->assertStatus(401);
        $this->get("/api/v1/suppliers/{$supplier->id}/statement/excel?currency=AED")->assertStatus(401);

        // 2. Client portal users CANNOT access supplier statement exports (403 Forbidden)
        $this->actingAs($this->clientUser)->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED")->assertStatus(403);
        $this->actingAs($this->clientUser)->get("/api/v1/suppliers/{$supplier->id}/statement/pdf?currency=AED")->assertStatus(403);
        $this->actingAs($this->clientUser)->get("/api/v1/suppliers/{$supplier->id}/statement/excel?currency=AED")->assertStatus(403);

        // 3. User without view_suppliers permission is rejected
        $this->actingAs($this->noAccess)->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED")->assertStatus(403);
        $this->actingAs($this->noAccess)->get("/api/v1/suppliers/{$supplier->id}/statement/pdf?currency=AED")->assertStatus(403);
        $this->actingAs($this->noAccess)->get("/api/v1/suppliers/{$supplier->id}/statement/excel?currency=AED")->assertStatus(403);

        // 4. Staff employee with view_suppliers permission can access
        $this->actingAs($this->viewer)->get("/api/v1/suppliers/{$supplier->id}/statement/print?currency=AED")->assertStatus(200);
        $this->actingAs($this->viewer)->get("/api/v1/suppliers/{$supplier->id}/statement/pdf?currency=AED")->assertStatus(200);
        $this->actingAs($this->viewer)->get("/api/v1/suppliers/{$supplier->id}/statement/excel?currency=AED")->assertStatus(200);
    }
}

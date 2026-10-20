<?php

namespace Tests\Feature;

use App\Enums\CurrencyCode;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\SupplierLedgerDirection;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Supplier;
use App\Models\User;
use App\Services\FinanceReportService;
use App\Services\QuotationCalculationService;
use App\Services\SupplierLedgerService;
use App\Support\Money;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrencyPrecisionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('super_admin');
        $this->company = Company::factory()->create();
    }

    public function test_currency_metadata_identifies_three_and_two_decimal_currencies(): void
    {
        $this->assertSame(3, CurrencyCode::precision('KWD'));
        $this->assertSame(3, CurrencyCode::precision('BHD'));
        $this->assertSame(3, CurrencyCode::precision('JOD'));
        $this->assertSame(3, CurrencyCode::precision('OMR'));
        $this->assertSame(3, CurrencyCode::precision('TND'));

        $this->assertSame(2, CurrencyCode::precision('AED'));
        $this->assertSame(2, CurrencyCode::precision('SAR'));
        $this->assertSame(2, CurrencyCode::precision('USD'));
        $this->assertSame(2, CurrencyCode::precision('EUR'));
        $this->assertSame(2, CurrencyCode::precision('GBP'));
    }

    public function test_money_and_decimal_exact_arithmetic_without_drift(): void
    {
        // 0.1 + 0.2 in floating point is 0.30000000000000004
        $this->assertSame('0.30', Money::add('0.10', '0.20', 'AED'));
        $this->assertSame('0.300', Money::add('0.100', '0.200', 'KWD'));

        // Three-decimal precision down to 0.001
        $this->assertSame('0.001', Money::normalize('0.001', 'KWD'));
        $this->assertSame('10.005', Money::add('10.004', '0.001', 'KWD'));
        $this->assertSame('10.003', Money::subtract('10.004', '0.001', 'KWD'));
        $this->assertSame('0.003', Money::multiply('3', '0.001', 'KWD'));

        // Minor units conversion
        $this->assertSame(1, Money::toMinorUnits('0.001', 'KWD'));
        $this->assertSame(1005, Money::toMinorUnits('1.005', 'KWD'));
        $this->assertSame(100, Money::toMinorUnits('1.00', 'AED'));
    }

    public function test_currency_input_validation_enforces_precision(): void
    {
        // KWD accepts up to 3 decimals, rejects 4
        $this->assertTrue(Money::hasValidPrecision('123.456', 'KWD'));
        $this->assertTrue(Money::hasValidPrecision('0.001', 'KWD'));
        $this->assertFalse(Money::hasValidPrecision('123.4567', 'KWD'));

        // AED accepts up to 2 decimals, rejects 3
        $this->assertTrue(Money::hasValidPrecision('123.45', 'AED'));
        $this->assertTrue(Money::hasValidPrecision('0.01', 'AED'));
        $this->assertFalse(Money::hasValidPrecision('123.456', 'AED'));
        $this->assertFalse(Money::hasValidPrecision('0.001', 'AED'));

        // API rejection test for excessive decimal precision
        $response = $this->actingAs($this->admin)->postJson('/api/v1/invoices', [
            'company_id' => $this->company->id,
            'currency' => 'AED',
            'items' => [
                ['description' => 'Test', 'quantity' => 1, 'unit_price' => '100.005'],
            ],
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.unit_price']);

        // Valid 3-decimal KWD invoice passes validation
        $kwdResponse = $this->actingAs($this->admin)->postJson('/api/v1/invoices', [
            'company_id' => $this->company->id,
            'currency' => 'KWD',
            'items' => [
                ['description' => 'Consulting', 'quantity' => 2, 'unit_price' => '125.125'],
            ],
        ]);
        $kwdResponse->assertCreated()
            ->assertJsonPath('data.currency', 'KWD')
            ->assertJsonPath('data.items.0.unit_price', '125.125')
            ->assertJsonPath('data.items.0.line_total', '250.250')
            ->assertJsonPath('data.total_amount', '250.250');
    }

    public function test_three_decimal_invoice_and_payment_settlement(): void
    {
        // 1. Create KWD invoice
        $createResponse = $this->actingAs($this->admin)->postJson('/api/v1/invoices', [
            'company_id' => $this->company->id,
            'currency' => 'KWD',
            'items' => [
                ['description' => 'Engine Development', 'quantity' => 1, 'unit_price' => '1000.755'],
            ],
        ])->assertCreated();

        $invoiceId = $createResponse->json('data.id');
        $this->assertSame('1000.755', $createResponse->json('data.total_amount'));

        // 2. Issue the invoice
        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoiceId}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', 'issued');

        // 3. Partial payment with 3 decimal precision
        $paidAt = now()->toIso8601String();
        $payment1Response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoiceId,
            'amount' => '300.255',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => $paidAt,
            'idempotency_key' => 'IDEM-KWD-001',
        ])->assertCreated();

        $this->assertSame('300.255', $payment1Response->json('data.amount'));
        $this->assertSame('700.500', $payment1Response->json('data.invoice.balance_due'));
        $this->assertSame('partially_paid', $payment1Response->json('data.invoice.status'));

        // Idempotency verification: resending same payload returns original payment
        $idempotentResponse = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoiceId,
            'amount' => '300.255',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => $paidAt,
            'idempotency_key' => 'IDEM-KWD-001',
        ])->assertCreated();
        $this->assertSame($payment1Response->json('data.id'), $idempotentResponse->json('data.id'));

        // 4. Overpayment rejection
        $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoiceId,
            'amount' => '700.501',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertStatus(422);

        // 5. Final settlement payment
        $payment2Response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoiceId,
            'amount' => '700.500',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertCreated();

        $this->assertSame('0.000', $payment2Response->json('data.invoice.balance_due'));
        $this->assertSame('paid', $payment2Response->json('data.invoice.status'));

        // 6. Reverse first payment and verify invoice recalculates to partially_paid
        $payment1Id = $payment1Response->json('data.id');
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment1Id}/reverse", [
            'reversal_reason' => 'Customer bounced transaction',
        ])->assertOk()
            ->assertJsonPath('data.status', 'reversed');

        $invoice = Invoice::findOrFail($invoiceId);
        $this->assertSame(InvoiceStatus::PARTIALLY_PAID, $invoice->status);
        $this->assertSame('300.255', $invoice->balanceDue());
    }

    public function test_three_decimal_supplier_ledger_and_balance_tracking(): void
    {
        $supplier = Supplier::create([
            'reference' => 'LM-SUP-KWD-0001',
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => 'Kuwait Cloud Services',
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $ledgerService = app(SupplierLedgerService::class);

        // 1. Fund supplier balance with 3 decimals
        $fundEntry = $ledgerService->fundBalance($supplier, [
            'amount' => '1500.555',
            'currency' => 'KWD',
            'transaction_date' => now()->toDateString(),
            'notes' => 'Initial funding in KWD',
        ], $this->admin->id);

        $this->assertSame('1500.555', $fundEntry->amount);
        $this->assertSame('1500.555', $fundEntry->balance_after);

        // 2. Adjust balance with 3 decimals
        $adjustEntry = $ledgerService->adjustBalance($supplier, [
            'amount' => '-200.222',
            'currency' => 'KWD',
            'transaction_date' => now()->toDateString(),
            'notes' => 'Fee deduction in KWD',
        ], $this->admin->id);

        $this->assertSame('200.222', $adjustEntry->amount);
        $this->assertSame(SupplierLedgerDirection::DEBIT, $adjustEntry->direction);
        $this->assertSame('1300.333', $adjustEntry->balance_after);

        // 3. Supplier API resource outputs normalized 3 decimals
        $supplierResponse = $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}")
            ->assertOk();

        $balance = collect($supplierResponse->json('data.balances'))->firstWhere('currency', 'KWD');
        $this->assertSame('1300.333', $balance['available']);
        $this->assertSame('1500.555', $balance['funded']);
    }

    public function test_quotation_calculations_with_three_decimal_currency(): void
    {
        $calc = app(QuotationCalculationService::class);

        // Line total: 2.5 quantity * 100.125 unit_price in BHD
        $lineTotal = $calc->itemLineTotal('2.5', '100.125', 'BHD');
        $this->assertSame('250.313', $lineTotal);

        // Total with discount and tax in JOD
        // subtotal 500.250, discount 50.125, tax 25.050 -> 475.175
        $total = $calc->total('500.250', '50.125', '25.050', 'JOD');
        $this->assertSame('475.175', $total);
    }

    public function test_finance_report_service_groups_by_currency_precision(): void
    {
        // Create an AED invoice and a KWD invoice
        $aedInvoice = Invoice::factory()->create([
            'company_id' => $this->company->id,
            'currency' => 'AED',
            'status' => InvoiceStatus::PAID,
            'subtotal' => '200.50',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '200.50',
            'created_by' => $this->admin->id,
        ]);

        Payment::factory()->create([
            'invoice_id' => $aedInvoice->id,
            'company_id' => $this->company->id,
            'amount' => '200.50',
            'currency' => 'AED',
            'status' => PaymentStatus::POSTED,
            'method' => PaymentMethod::BANK_TRANSFER,
            'paid_at' => now(),
            'recorded_by' => $this->admin->id,
        ]);

        $kwdInvoice = Invoice::factory()->create([
            'company_id' => $this->company->id,
            'currency' => 'KWD',
            'status' => InvoiceStatus::PAID,
            'subtotal' => '100.125',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '100.125',
            'created_by' => $this->admin->id,
        ]);

        Payment::factory()->create([
            'invoice_id' => $kwdInvoice->id,
            'company_id' => $this->company->id,
            'amount' => '100.125',
            'currency' => 'KWD',
            'status' => PaymentStatus::POSTED,
            'method' => PaymentMethod::BANK_TRANSFER,
            'paid_at' => now(),
            'recorded_by' => $this->admin->id,
        ]);

        $reportService = app(FinanceReportService::class);
        $overview = $reportService->overview();

        $cashIn = collect($overview['cash_flow']['cash_in']);
        $aedCash = $cashIn->firstWhere('currency', 'AED');
        $kwdCash = $cashIn->firstWhere('currency', 'KWD');

        $this->assertNotNull($aedCash);
        $this->assertNotNull($kwdCash);
        $this->assertSame('200.50', $aedCash['amount']);
        $this->assertSame('100.125', $kwdCash['amount']);
    }
}

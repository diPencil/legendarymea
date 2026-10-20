<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MultiInvoicePaymentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Company $company;
    protected Company $otherCompany;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->company = Company::factory()->create();
        $this->otherCompany = Company::factory()->create();
    }

    private function createInvoice(array $overrides = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'status' => InvoiceStatus::ISSUED,
            'currency' => 'AED',
            'total_amount' => '1000.00',
            'subtotal' => '1000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'issue_date' => now()->subDays(5)->format('Y-m-d'),
            'due_date' => now()->addDays(5)->format('Y-m-d'),
        ], $overrides));
    }

    public function test_manual_allocation_covers_multiple_invoices_partially_and_fully(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);
        $inv2 = $this->createInvoice(['total_amount' => '1000.00', 'subtotal' => '1000.00']);

        // Payment of 800: 500 to inv1 (fully paid), 300 to inv2 (partially paid)
        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 800,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'notes' => 'Split payment',
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => 500],
                ['invoice_id' => $inv2->id, 'amount' => 300],
            ],
        ]);

        $response->assertCreated();
        $paymentId = $response->json('data.id');

        $payment = Payment::with('allocations')->findOrFail($paymentId);
        $this->assertNull($payment->invoice_id);
        $this->assertEquals('800.000', $payment->amount);
        $this->assertEquals('800.000', $payment->allocated_amount);
        $this->assertEquals('0.000', $payment->unallocated_amount);
        $this->assertCount(2, $payment->allocations);

        $inv1->refresh();
        $inv2->refresh();

        $this->assertEquals(InvoiceStatus::PAID, $inv1->status);
        $this->assertEquals('500.00', $inv1->postedPaymentsTotal());
        $this->assertEquals('0.00', $inv1->balanceDue());

        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv2->status);
        $this->assertEquals('300.00', $inv2->postedPaymentsTotal());
        $this->assertEquals('700.00', $inv2->balanceDue());
    }

    public function test_aed_25000_invoices_reconcile_to_20000_receipt_and_5000_outstanding(): void
    {
        $firstInvoice = $this->createInvoice([
            'total_amount' => '10000.00',
            'subtotal' => '10000.00',
        ]);
        $secondInvoice = $this->createInvoice([
            'total_amount' => '15000.00',
            'subtotal' => '15000.00',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => '20000.00',
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'idempotency_key' => 'phase5-aed-25000-reconciliation',
            'allocations' => [
                ['invoice_id' => $firstInvoice->id, 'amount' => '10000.00'],
                ['invoice_id' => $secondInvoice->id, 'amount' => '10000.00'],
            ],
        ])->assertCreated();

        $payment = Payment::with('allocations')->findOrFail($response->json('data.id'));
        $firstInvoice->refresh();
        $secondInvoice->refresh();

        $this->assertSame('20000.000', $payment->amount);
        $this->assertSame('20000.000', $payment->allocated_amount);
        $this->assertSame('0.000', $payment->unallocated_amount);
        $this->assertSame('20000.00', Money::add(
            $payment->allocations[0]->amount,
            $payment->allocations[1]->amount,
            'AED'
        ));

        $this->assertSame('0.00', $firstInvoice->balanceDue());
        $this->assertSame('5000.00', $secondInvoice->balanceDue());
        $this->assertSame('5000.00', Money::add(
            $firstInvoice->balanceDue(),
            $secondInvoice->balanceDue(),
            'AED'
        ));
        $this->assertSame('25000.00', Money::add(
            $firstInvoice->total_amount,
            $secondInvoice->total_amount,
            'AED'
        ));
    }

    public function test_automatic_fifo_allocation_by_due_date(): void
    {
        // inv1 due earlier, inv2 due later
        $inv1 = $this->createInvoice([
            'total_amount' => '400.00',
            'subtotal' => '400.00',
            'due_date' => now()->addDays(2)->format('Y-m-d'),
        ]);
        $inv2 = $this->createInvoice([
            'total_amount' => '600.00',
            'subtotal' => '600.00',
            'due_date' => now()->addDays(10)->format('Y-m-d'),
        ]);

        // Payment of 700 with auto_allocate: true
        // Should pay inv1 in full (400), and pay 300 to inv2
        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 700,
            'currency' => 'AED',
            'method' => PaymentMethod::CASH->value,
            'paid_at' => now()->toIso8601String(),
            'auto_allocate' => true,
        ]);

        $response->assertCreated();
        $paymentId = $response->json('data.id');

        $payment = Payment::with('allocations')->findOrFail($paymentId);
        $this->assertEquals('700.000', $payment->allocated_amount);
        $this->assertEquals('0.000', $payment->unallocated_amount);
        $this->assertCount(2, $payment->allocations);

        $inv1->refresh();
        $inv2->refresh();

        $this->assertEquals(InvoiceStatus::PAID, $inv1->status);
        $this->assertEquals('0.00', $inv1->balanceDue());

        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv2->status);
        $this->assertEquals('300.00', $inv2->balanceDue());
    }

    public function test_payment_creates_unallocated_company_credit(): void
    {
        $inv = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);

        // Payment of 800: 500 allocated to inv, 300 unallocated credit
        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 800,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => 500],
            ],
        ]);

        $response->assertCreated();
        $payment = Payment::findOrFail($response->json('data.id'));

        $this->assertEquals('500.000', $payment->allocated_amount);
        $this->assertEquals('300.000', $payment->unallocated_amount);
    }

    public function test_rejects_mixed_company_allocation(): void
    {
        $invCompany = $this->createInvoice(['company_id' => $this->company->id]);
        $invOther = $this->createInvoice(['company_id' => $this->otherCompany->id]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 1000,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $invCompany->id, 'amount' => 500],
                ['invoice_id' => $invOther->id, 'amount' => 500],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['allocations.1.invoice_id']);
    }

    public function test_rejects_mixed_currency_allocation(): void
    {
        $invAED = $this->createInvoice(['currency' => 'AED', 'total_amount' => '500.00', 'subtotal' => '500.00']);
        $invUSD = $this->createInvoice(['currency' => 'USD', 'total_amount' => '500.00', 'subtotal' => '500.00']);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 500,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $invUSD->id, 'amount' => 500],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['allocations.0.invoice_id']);
    }

    public function test_rejects_duplicate_invoice_in_allocations(): void
    {
        $inv = $this->createInvoice(['total_amount' => '1000.00', 'subtotal' => '1000.00']);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 600,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => 300],
                ['invoice_id' => $inv->id, 'amount' => 300],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['allocations']);
    }

    public function test_rejects_allocation_exceeding_invoice_balance(): void
    {
        $inv = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 600,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => 600],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['allocations.0.amount']);
    }

    public function test_rejects_total_allocation_exceeding_payment_amount(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);
        $inv2 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 500,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => 300],
                ['invoice_id' => $inv2->id, 'amount' => 300],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['allocations']);
    }

    public function test_idempotent_multi_invoice_payment_retries(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);
        $inv2 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);

        $payload = [
            'company_id' => $this->company->id,
            'amount' => 600,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => '2026-10-20T10:00:00Z',
            'idempotency_key' => 'idem-multi-invoice-12345',
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => 300],
                ['invoice_id' => $inv2->id, 'amount' => 300],
            ],
        ];

        $res1 = $this->actingAs($this->admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $paymentId1 = $res1->json('data.id');

        // Exact retry
        $res2 = $this->actingAs($this->admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $this->assertEquals($paymentId1, $res2->json('data.id'));

        // Conflicting retry with different amount
        $conflicting = array_merge($payload, ['amount' => 700]);
        $this->actingAs($this->admin)->postJson('/api/v1/payments', $conflicting)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['idempotency_key']);
    }

    public function test_multi_invoice_payment_reversal_recalculates_all_invoices_atomically(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);
        $inv2 = $this->createInvoice(['total_amount' => '500.00', 'subtotal' => '500.00']);

        $createRes = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 700,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => 500],
                ['invoice_id' => $inv2->id, 'amount' => 200],
            ],
        ]);

        $paymentId = $createRes->json('data.id');

        $inv1->refresh();
        $inv2->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv1->status);
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv2->status);

        // Reverse the payment
        $revRes = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$paymentId}/reverse", [
            'reversal_reason' => 'Customer bounced check.',
        ]);

        $revRes->assertOk();
        $this->assertEquals(PaymentStatus::REVERSED->value, $revRes->json('data.status'));

        // Allocations must have reversed_at set
        $allocations = PaymentAllocation::where('payment_id', $paymentId)->get();
        $this->assertCount(2, $allocations);
        foreach ($allocations as $alloc) {
            $this->assertNotNull($alloc->reversed_at);
        }

        // Both invoices should now be restored to ISSUED with 0 paid
        $inv1->refresh();
        $inv2->refresh();
        $this->assertEquals(InvoiceStatus::ISSUED, $inv1->status);
        $this->assertEquals('0.00', $inv1->postedPaymentsTotal());
        $this->assertEquals('500.00', $inv1->balanceDue());

        $this->assertEquals(InvoiceStatus::ISSUED, $inv2->status);
        $this->assertEquals('0.00', $inv2->postedPaymentsTotal());
        $this->assertEquals('500.00', $inv2->balanceDue());
    }

    public function test_legacy_single_invoice_payment_creates_allocation_transparently(): void
    {
        $inv = $this->createInvoice(['total_amount' => '1000.00', 'subtotal' => '1000.00']);

        // Legacy format: invoice_id at root
        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $inv->id,
            'amount' => 450,
            'method' => PaymentMethod::CARD->value,
            'paid_at' => now()->toIso8601String(),
        ]);

        $response->assertCreated();
        $paymentId = $response->json('data.id');

        $payment = Payment::with('allocations')->findOrFail($paymentId);
        $this->assertEquals($inv->id, $payment->invoice_id);
        $this->assertEquals('450.000', $payment->allocated_amount);
        $this->assertEquals('0.000', $payment->unallocated_amount);
        $this->assertCount(1, $payment->allocations);
        $this->assertEquals('450.000', $payment->allocations->first()->amount);
        $this->assertEquals($inv->id, $payment->allocations->first()->invoice_id);

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv->status);
        $this->assertEquals('450.00', $inv->postedPaymentsTotal());
        $this->assertEquals('550.00', $inv->balanceDue());
    }

    public function test_three_decimal_precision_currencies_kwd_bhd_jod(): void
    {
        $inv = $this->createInvoice([
            'currency' => 'KWD',
            'total_amount' => '125.750',
            'subtotal' => '125.750',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => '125.750',
            'currency' => 'KWD',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '125.750'],
            ],
        ]);

        $response->assertCreated();
        $payment = Payment::findOrFail($response->json('data.id'));
        $this->assertEquals('125.750', $payment->allocated_amount);

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv->status);
        $this->assertEquals('0.000', $inv->balanceDue());
    }

    public function test_outstanding_invoices_endpoint_returns_correct_list_and_balances(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '500.00', 'currency' => 'AED']);
        $inv2 = $this->createInvoice(['total_amount' => '700.00', 'currency' => 'AED']);
        $invOtherCurrency = $this->createInvoice(['total_amount' => '300.00', 'currency' => 'USD']);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/payments/outstanding-invoices?company_id={$this->company->id}&currency=AED");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals($inv1->id, $data[0]['id']);
        $this->assertEquals('500.00', $data[0]['balance_due']);
        $this->assertEquals($inv2->id, $data[1]['id']);
        $this->assertEquals('700.00', $data[1]['balance_due']);
    }

    public function test_allocations_endpoint_returns_all_allocations_for_payment(): void
    {
        $inv1 = $this->createInvoice(['total_amount' => '400.00']);
        $inv2 = $this->createInvoice(['total_amount' => '600.00']);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => 500,
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => 200],
                ['invoice_id' => $inv2->id, 'amount' => 300],
            ],
        ]);

        $paymentId = $res->json('data.id');

        $allocRes = $this->actingAs($this->admin)->getJson("/api/v1/payments/{$paymentId}/allocations");
        $allocRes->assertOk();
        $allocData = $allocRes->json('data');
        $this->assertCount(2, $allocData);
        $this->assertEquals('200.00', $allocData[0]['amount']);
        $this->assertEquals($inv1->id, $allocData[0]['invoice_id']);
        $this->assertEquals('300.00', $allocData[1]['amount']);
        $this->assertEquals($inv2->id, $allocData[1]['invoice_id']);
    }

    public function test_omr_and_tnd_multi_invoice_allocation_preserves_three_decimals(): void
    {
        $invOMR = $this->createInvoice([
            'currency' => 'OMR',
            'total_amount' => '150.125',
            'subtotal' => '150.125',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => '150.125',
            'currency' => 'OMR',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $invOMR->id, 'amount' => '150.125'],
            ],
        ]);

        $response->assertCreated();
        $this->assertEquals('150.125', $response->json('data.amount'));
        $this->assertEquals('150.125', $response->json('data.allocated_amount'));
        $this->assertEquals('0.000', $response->json('data.unallocated_amount'));

        $invOMR->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $invOMR->status);
        $this->assertEquals('0.000', $invOMR->balanceDue());
    }

    public function test_financial_history_protection_prevents_silent_cascade_deletion(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        $inv = $this->createInvoice(['total_amount' => '500.00']);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'company_id' => $this->company->id,
            'amount' => '500.00',
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ]);

        $res->assertCreated();
        $paymentId = $res->json('data.id');

        $this->assertDatabaseHas('payment_allocations', [
            'payment_id' => $paymentId,
            'invoice_id' => $inv->id,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('payments')->where('id', $paymentId)->delete();
    }
}

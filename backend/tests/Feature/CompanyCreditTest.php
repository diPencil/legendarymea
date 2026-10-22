<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Services\FinanceReportService;
use App\Support\Money;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyCreditTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $viewer;
    private Company $company;
    private Company $otherCompany;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('employee');

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

    private function createPostedPaymentWithCredit(string $totalAmount, string $allocatedAmount, string $currency = 'AED', ?Company $company = null): Payment
    {
        $comp = $company ?? $this->company;
        $unallocated = Money::subtract($totalAmount, $allocatedAmount, $currency);

        return Payment::factory()->create([
            'company_id' => $comp->id,
            'customer_type' => 'company',
            'currency' => $currency,
            'amount' => $totalAmount,
            'allocated_amount' => $allocatedAmount,
            'unallocated_amount' => $unallocated,
            'status' => PaymentStatus::POSTED,
            'method' => PaymentMethod::BANK_TRANSFER,
            'paid_at' => now()->subDays(2),
            'recorded_by' => $this->admin->id,
        ]);
    }

    public function test_available_credits_endpoint_lists_payments_and_summary(): void
    {
        // Payment with 500 AED credit
        $p1 = $this->createPostedPaymentWithCredit('1000.00', '500.00', 'AED');
        // Payment with 200 AED credit
        $p2 = $this->createPostedPaymentWithCredit('500.00', '300.00', 'AED');
        // Payment fully allocated (0 credit) - should not appear
        $p3 = $this->createPostedPaymentWithCredit('400.00', '400.00', 'AED');
        // Payment reversed - should not appear
        $pRev = $this->createPostedPaymentWithCredit('1000.00', '500.00', 'AED');
        $pRev->update(['status' => PaymentStatus::REVERSED]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/payments/available-credits?company_id={$this->company->id}&currency=AED");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals($p1->id, $data[0]['id']);
        $this->assertEquals('500.00', $data[0]['unallocated_amount']);
        $this->assertEquals($p2->id, $data[1]['id']);
        $this->assertEquals('200.00', $data[1]['unallocated_amount']);

        $summary = $response->json('summary');
        $aedSummary = collect($summary)->firstWhere('currency', 'AED');
        $this->assertNotNull($aedSummary);
        $this->assertEquals('700.00', $aedSummary['available_credit']);
    }

    public function test_full_credit_consumption(): void
    {
        $payment = $this->createPostedPaymentWithCredit('2000.00', '1500.00', 'AED'); // 500 unallocated
        $inv = $this->createInvoice(['total_amount' => '500.00']);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ]);

        $response->assertCreated();
        $payment->refresh();
        $this->assertEquals('2000.000', $payment->amount);
        $this->assertEquals('2000.000', $payment->allocated_amount);
        $this->assertEquals('0.000', $payment->unallocated_amount);

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv->status);
        $this->assertEquals('0.00', $inv->balanceDue());
        $this->assertEquals('500.00', $inv->postedPaymentsTotal());
    }

    public function test_partial_credit_consumption(): void
    {
        $payment = $this->createPostedPaymentWithCredit('20000.00', '15000.00', 'AED'); // 5000 available
        $inv = $this->createInvoice(['total_amount' => '10000.00']);

        // Consume 3000 out of 5000 available credit
        $response = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '3000.00'],
            ],
        ]);

        $response->assertCreated();
        $payment->refresh();
        $this->assertEquals('20000.000', $payment->amount); // Invariant preserved: original cash receipt unchanged
        $this->assertEquals('18000.000', $payment->allocated_amount);
        $this->assertEquals('2000.000', $payment->unallocated_amount);

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv->status);
        $this->assertEquals('7000.00', $inv->balanceDue());
        $this->assertEquals('3000.00', $inv->postedPaymentsTotal());
    }

    public function test_one_source_payment_to_multiple_invoices(): void
    {
        $payment = $this->createPostedPaymentWithCredit('5000.00', '1000.00', 'AED'); // 4000 available
        $inv1 = $this->createInvoice(['total_amount' => '1500.00']);
        $inv2 = $this->createInvoice(['total_amount' => '2000.00']);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv1->id, 'amount' => '1500.00'],
                ['invoice_id' => $inv2->id, 'amount' => '1000.00'],
            ],
        ]);

        $response->assertCreated();
        $payment->refresh();
        $this->assertEquals('3500.000', $payment->allocated_amount);
        $this->assertEquals('1500.000', $payment->unallocated_amount);

        $inv1->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv1->status);
        $this->assertEquals('0.00', $inv1->balanceDue());

        $inv2->refresh();
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv2->status);
        $this->assertEquals('1000.00', $inv2->balanceDue());
    }

    public function test_different_source_payments_contributing_to_one_invoice(): void
    {
        $p1 = $this->createPostedPaymentWithCredit('1000.00', '500.00', 'AED'); // 500 available
        $p2 = $this->createPostedPaymentWithCredit('2000.00', '1000.00', 'AED'); // 1000 available
        $inv = $this->createInvoice(['total_amount' => '1200.00']);

        // Apply 500 from p1
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$p1->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ])->assertCreated();

        $inv->refresh();
        $this->assertEquals('700.00', $inv->balanceDue());

        // Apply remaining 700 from p2
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$p2->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '700.00'],
            ],
        ])->assertCreated();

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv->status);
        $this->assertEquals('0.00', $inv->balanceDue());
        $this->assertEquals('1200.00', $inv->postedPaymentsTotal());

        $p2->refresh();
        $this->assertEquals('1700.000', $p2->allocated_amount);
        $this->assertEquals('300.000', $p2->unallocated_amount);
    }

    public function test_idempotent_retries_and_mismatched_payload_rejection(): void
    {
        $payment = $this->createPostedPaymentWithCredit('2000.00', '1000.00', 'AED'); // 1000 available
        $inv = $this->createInvoice(['total_amount' => '800.00']);

        $payload = [
            'company_id' => $this->company->id,
            'idempotency_key' => 'IDEM-CREDIT-TEST-1',
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ];

        // 1. First execution
        $res1 = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", $payload);
        $res1->assertCreated();

        // 2. Retry with same idempotency key and exact payload returns same result
        $res2 = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", $payload);
        $res2->assertCreated();

        // Ensure credit was consumed only once
        $payment->refresh();
        $this->assertEquals('1500.000', $payment->allocated_amount);
        $this->assertEquals('500.000', $payment->unallocated_amount);

        // 3. Retry with same idempotency key but different payload fails
        $mismatchedPayload = [
            'company_id' => $this->company->id,
            'idempotency_key' => 'IDEM-CREDIT-TEST-1',
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '300.00'], // different amount
            ],
        ];
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", $mismatchedPayload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['idempotency_key']);
    }

    public function test_idempotency_key_cannot_be_reused_for_another_payment(): void
    {
        $firstPayment = $this->createPostedPaymentWithCredit('2000.00', '1000.00', 'AED');
        $secondPayment = $this->createPostedPaymentWithCredit('3000.00', '1000.00', 'AED');
        $firstInvoice = $this->createInvoice(['total_amount' => '500.00']);
        $secondInvoice = $this->createInvoice(['total_amount' => '700.00']);

        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$firstPayment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'idempotency_key' => 'IDEM-CREDIT-CROSS-PAYMENT',
            'allocations' => [
                ['invoice_id' => $firstInvoice->id, 'amount' => '500.00'],
            ],
        ])->assertCreated();

        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$secondPayment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'idempotency_key' => 'IDEM-CREDIT-CROSS-PAYMENT',
            'allocations' => [
                ['invoice_id' => $secondInvoice->id, 'amount' => '700.00'],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['idempotency_key']);

        $secondPayment->refresh();
        $secondInvoice->refresh();

        $this->assertSame('1000.000', $secondPayment->allocated_amount);
        $this->assertSame('2000.000', $secondPayment->unallocated_amount);
        $this->assertSame('700.00', $secondInvoice->balanceDue());
        $this->assertDatabaseCount('payment_allocation_requests', 1);
    }

    public function test_rejects_insufficient_credit(): void
    {
        $payment = $this->createPostedPaymentWithCredit('1000.00', '800.00', 'AED'); // 200 available
        $inv = $this->createInvoice(['total_amount' => '500.00']);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '300.00'], // exceeds 200 available
            ],
        ]);

        $response->assertStatus(422);
        $payment->refresh();
        $this->assertEquals('200.000', $payment->unallocated_amount); // unchanged
    }

    public function test_rejects_allocation_exceeding_invoice_balance(): void
    {
        $payment = $this->createPostedPaymentWithCredit('5000.00', '1000.00', 'AED'); // 4000 available
        $inv = $this->createInvoice(['total_amount' => '500.00']); // only 500 balance

        $response = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '600.00'], // exceeds 500 balance
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_cross_company_and_cross_currency_application(): void
    {
        $payment = $this->createPostedPaymentWithCredit('5000.00', '1000.00', 'AED');
        $otherCompanyInvoice = $this->createInvoice(['company_id' => $this->otherCompany->id, 'total_amount' => '500.00']);
        $usdInvoice = $this->createInvoice(['currency' => 'USD', 'total_amount' => '500.00']);

        // Cross company
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $otherCompanyInvoice->id, 'amount' => '500.00'],
            ],
        ])->assertStatus(422);

        // Cross currency
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $usdInvoice->id, 'amount' => '500.00'],
            ],
        ])->assertStatus(422);
    }

    public function test_rejects_reversed_source_payment(): void
    {
        $payment = $this->createPostedPaymentWithCredit('2000.00', '1000.00', 'AED');
        $payment->update(['status' => PaymentStatus::REVERSED]);
        $inv = $this->createInvoice(['total_amount' => '500.00']);

        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ])->assertStatus(422);
    }

    public function test_credit_allocation_reversal_restores_credit_and_recalculates_invoice(): void
    {
        $payment = $this->createPostedPaymentWithCredit('3000.00', '1000.00', 'AED'); // 2000 available
        $inv = $this->createInvoice(['total_amount' => '1000.00']);

        // Apply 800 credit
        $applyRes = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '800.00'],
            ],
        ]);
        $applyRes->assertCreated();
        $allocationId = $applyRes->json('data.allocations.0.id');

        $payment->refresh();
        $this->assertEquals('1800.000', $payment->allocated_amount);
        $this->assertEquals('1200.000', $payment->unallocated_amount);

        $inv->refresh();
        $this->assertEquals('200.00', $inv->balanceDue());
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $inv->status);

        // Reverse the credit allocation
        $revRes = $this->actingAs($this->admin)->postJson("/api/v1/payment-allocations/{$allocationId}/reverse", [
            'reversal_reason' => 'Client requested credit reinstatement',
        ]);
        $revRes->assertOk();
        $this->assertTrue($revRes->json('data.is_reversed'));
        $this->assertEquals('Client requested credit reinstatement', $revRes->json('data.reversal_reason'));

        // Payment credit is restored exactly
        $payment->refresh();
        $this->assertEquals('1000.000', $payment->allocated_amount);
        $this->assertEquals('2000.000', $payment->unallocated_amount);
        $this->assertEquals(PaymentStatus::POSTED, $payment->status); // Original payment remains posted!

        // Invoice balance is restored
        $inv->refresh();
        $this->assertEquals('1000.00', $inv->balanceDue());
        $this->assertEquals(InvoiceStatus::ISSUED, $inv->status);

        // Double reversal is prevented
        $this->actingAs($this->admin)->postJson("/api/v1/payment-allocations/{$allocationId}/reverse", [
            'reversal_reason' => 'Attempt duplicate reversal',
        ])->assertStatus(422);
    }

    public function test_allocation_only_reversal_keeps_receipt_posted_and_all_read_paths_consistent(): void
    {
        $invoice = $this->createInvoice(['total_amount' => '10152.32']);

        $otherPayment = $this->createPostedPaymentWithCredit('7319.25', '7319.25');
        PaymentAllocation::create([
            'payment_id' => $otherPayment->id,
            'invoice_id' => $invoice->id,
            'amount' => '7319.25',
        ]);

        $affectedPayment = $this->createPostedPaymentWithCredit('2500.00', '2500.00');
        $affectedAllocation = PaymentAllocation::create([
            'payment_id' => $affectedPayment->id,
            'invoice_id' => $invoice->id,
            'amount' => '2500.00',
        ]);

        $this->assertSame('9819.25', $invoice->fresh()->postedPaymentsTotal());
        $this->assertSame('333.07', $invoice->fresh()->balanceDue());

        $this->actingAs($this->admin)
            ->postJson("/api/v1/payment-allocations/{$affectedAllocation->id}/reverse", [
                'reversal_reason' => 'Allocation-only incident regression',
            ])
            ->assertOk()
            ->assertJsonPath('data.is_reversed', true);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/payments/{$affectedPayment->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'posted')
            ->assertJsonPath('data.allocated_amount', '0.00')
            ->assertJsonPath('data.unallocated_amount', '2500.00')
            ->assertJsonPath('data.reversed_at', null);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/payments/{$affectedPayment->id}/allocations")
            ->assertOk()
            ->assertJsonPath('data.0.is_reversed', true)
            ->assertJsonPath('data.0.reversal_reason', 'Allocation-only incident regression');

        $this->actingAs($this->admin)
            ->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.paid_amount', '7319.25')
            ->assertJsonPath('data.balance_due', '2833.07');

        $affectedPayment->refresh();
        $this->assertSame(PaymentStatus::POSTED, $affectedPayment->status);
        $this->assertNull($affectedPayment->reversed_at);
        $this->assertSame('0.000', $affectedPayment->allocated_amount);
        $this->assertSame('2500.000', $affectedPayment->unallocated_amount);
        $this->assertSame('7319.25', $invoice->fresh()->postedPaymentsTotal());
        $this->assertSame('2833.07', $invoice->fresh()->balanceDue());
    }

    public function test_original_payment_reversal_reverses_credit_applications_atomically(): void
    {
        $payment = $this->createPostedPaymentWithCredit('5000.00', '2000.00', 'AED'); // 3000 available
        $inv = $this->createInvoice(['total_amount' => '2500.00']);

        // Apply credit to invoice
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '2500.00'],
            ],
        ])->assertCreated();

        $inv->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $inv->status);

        // Now reverse the entire original payment receipt
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/reverse", [
            'reversal_reason' => 'Check bounced at bank',
        ])->assertOk();

        $payment->refresh();
        $this->assertEquals(PaymentStatus::REVERSED, $payment->status);

        // All allocations are marked reversed
        $allocations = $payment->allocations()->get();
        foreach ($allocations as $alloc) {
            $this->assertNotNull($alloc->reversed_at);
        }

        // Invoice is no longer paid and reflects full balance due
        $inv->refresh();
        $this->assertEquals(InvoiceStatus::ISSUED, $inv->status);
        $this->assertEquals('2500.00', $inv->balanceDue());
    }

    public function test_financial_reporting_not_inflated_by_credit_consumption(): void
    {
        $reportService = app(FinanceReportService::class);

        // 1. Baseline overview before credit application
        $overview1 = $reportService->overview();
        $initialCashIn = collect($overview1['cash_flow']['cash_in'])->firstWhere('currency', 'AED')['amount'] ?? '0.00';

        // 2. Create posted payment (5000 received, 2000 allocated, 3000 credit)
        $payment = $this->createPostedPaymentWithCredit('5000.00', '2000.00', 'AED');

        // Cash flow should reflect 5000
        $overview2 = $reportService->overview();
        $cashInAfterPayment = collect($overview2['cash_flow']['cash_in'])->firstWhere('currency', 'AED')['amount'];
        $this->assertEquals(Money::add($initialCashIn, '5000.00', 'AED'), $cashInAfterPayment);

        // 3. Now consume 2500 credit on an invoice
        $inv = $this->createInvoice(['total_amount' => '2500.00']);
        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '2500.00'],
            ],
        ])->assertCreated();

        // Cash flow MUST NOT increase (it must remain exactly the same 5000 cash in)
        $overview3 = $reportService->overview();
        $cashInAfterCreditApplied = collect($overview3['cash_flow']['cash_in'])->firstWhere('currency', 'AED')['amount'];
        $this->assertEquals($cashInAfterPayment, $cashInAfterCreditApplied);
    }

    public function test_three_decimal_currencies_credit_consumption_and_precision(): void
    {
        // Test with KWD (3 decimals)
        $kwdPayment = $this->createPostedPaymentWithCredit('150.750', '50.250', 'KWD'); // 100.500 available
        $kwdInvoice = $this->createInvoice([
            'currency' => 'KWD',
            'total_amount' => '100.500',
            'subtotal' => '100.500',
        ]);

        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$kwdPayment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $kwdInvoice->id, 'amount' => '100.500'],
            ],
        ])->assertCreated();

        $kwdPayment->refresh();
        $this->assertEquals('150.750', $kwdPayment->allocated_amount);
        $this->assertEquals('0.000', $kwdPayment->unallocated_amount);

        $kwdInvoice->refresh();
        $this->assertEquals(InvoiceStatus::PAID, $kwdInvoice->status);
        $this->assertEquals('0.000', $kwdInvoice->balanceDue());

        // Reject 4th decimal place
        $omrPayment = $this->createPostedPaymentWithCredit('200.125', '100.000', 'OMR');
        $omrInvoice = $this->createInvoice(['currency' => 'OMR', 'total_amount' => '100.125']);

        $this->actingAs($this->admin)->postJson("/api/v1/payments/{$omrPayment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $omrInvoice->id, 'amount' => '50.1234'], // 4 decimals rejected
            ],
        ])->assertStatus(422);
    }

    public function test_permissions_enforced_on_credit_endpoints(): void
    {
        $payment = $this->createPostedPaymentWithCredit('1000.00', '500.00', 'AED');
        $inv = $this->createInvoice(['total_amount' => '500.00']);

        // Viewer cannot apply credit
        $this->actingAs($this->viewer)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ])->assertForbidden();

        // Apply as admin
        $res = $this->actingAs($this->admin)->postJson("/api/v1/payments/{$payment->id}/apply-credit", [
            'company_id' => $this->company->id,
            'allocations' => [
                ['invoice_id' => $inv->id, 'amount' => '500.00'],
            ],
        ])->assertCreated();

        $allocId = $res->json('data.allocations.0.id');

        // Viewer cannot reverse credit allocation
        $this->actingAs($this->viewer)->postJson("/api/v1/payment-allocations/{$allocId}/reverse", [
            'reversal_reason' => 'Unauthorized attempt',
        ])->assertForbidden();

        // Admin can reverse
        $this->actingAs($this->admin)->postJson("/api/v1/payment-allocations/{$allocId}/reverse", [
            'reversal_reason' => 'Authorized reversal',
        ])->assertOk();
    }
}

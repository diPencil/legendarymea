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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employee;
    protected User $noAccess;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->employee = User::factory()->create();
        $this->employee->assignRole('employee');

        $this->noAccess = User::factory()->create();
        $this->company = Company::factory()->create();
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

    public function test_requires_authentication_and_permission(): void
    {
        $invoice = $this->createInvoice();

        $this->getJson('/api/v1/payments')->assertUnauthorized();

        $this->actingAs($this->noAccess)->getJson('/api/v1/payments')->assertForbidden();

        $this->actingAs($this->employee)->getJson('/api/v1/payments')->assertOk();
        $this->actingAs($this->employee)->getJson("/api/v1/payments/{$invoice->id}")->assertNotFound();
    }

    public function test_view_only_cannot_record_or_reverse_payment(): void
    {
        $invoice = $this->createInvoice();
        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => $invoice->currency,
        ]);

        $this->actingAs($this->employee)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => 100,
                'method' => PaymentMethod::BANK_TRANSFER->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertForbidden();

        $this->actingAs($this->employee)
            ->postJson("/api/v1/payments/{$payment->id}/reverse", [
                'reversal_reason' => 'Customer payment duplicated.',
            ])
            ->assertForbidden();
    }

    public function test_creates_payment_and_recalculates_invoice_to_partial_then_paid(): void
    {
        $invoice = $this->createInvoice();

        $first = $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => '250.00',
                'method' => PaymentMethod::BANK_TRANSFER->value,
                'transaction_reference' => 'BANK-REF-001',
                'paid_at' => now()->toIso8601String(),
                'notes' => 'Initial transfer.',
            ])
            ->assertCreated();

        $this->assertMatchesRegularExpression('/^LM-PAY-\d{4}-\d{6}$/', $first->json('data.reference'));
        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '250.00',
            'currency' => 'AED',
            'recorded_by' => $this->admin->id,
        ]);
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $invoice->fresh()->status);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => '750.00',
                'method' => PaymentMethod::CARD->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertCreated();

        $this->assertEquals(InvoiceStatus::PAID, $invoice->fresh()->status);
    }

    public function test_duplicate_payment_submission_with_same_idempotency_key_returns_original_payment(): void
    {
        $invoice = $this->createInvoice();
        $paidAt = now()->startOfSecond()->toIso8601String();
        $payload = [
            'invoice_id' => $invoice->id,
            'idempotency_key' => 'payment-test-idempotency-key',
            'amount' => '250.00',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'transaction_reference' => 'BANK-IDEMPOTENT-001',
            'paid_at' => $paidAt,
            'notes' => 'Idempotent payment submission.',
        ];

        $first = $this->actingAs($this->admin)->postJson('/api/v1/payments', $payload)->assertCreated();
        $second = $this->actingAs($this->admin)->postJson('/api/v1/payments', $payload)->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame($first->json('data.reference'), $second->json('data.reference'));
        $this->assertDatabaseCount('payments', 1);
        $this->assertSame('250.00', $invoice->fresh()->postedPaymentsTotal());
    }

    public function test_reusing_idempotency_key_for_different_payment_is_rejected(): void
    {
        $invoice = $this->createInvoice();
        $paidAt = now()->startOfSecond()->toIso8601String();
        $payload = [
            'invoice_id' => $invoice->id,
            'idempotency_key' => 'payment-test-conflicting-key',
            'amount' => '200.00',
            'method' => PaymentMethod::CASH->value,
            'paid_at' => $paidAt,
        ];

        $this->actingAs($this->admin)->postJson('/api/v1/payments', $payload)->assertCreated();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [...$payload, 'amount' => '300.00'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['idempotency_key']);

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_payment_creation_locks_invoice_and_rejects_competing_overpayment(): void
    {
        $invoice = $this->createInvoice();
        DB::enableQueryLog();

        $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoice->id,
            'amount' => '600.00',
            'method' => PaymentMethod::BANK_TRANSFER->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertCreated();

        $queries = collect(DB::getQueryLog())->pluck('query')->map(fn (string $query) => strtolower($query));
        DB::disableQueryLog();

        $this->assertTrue($queries->contains(
            fn (string $query) => str_contains($query, 'invoices') && str_contains($query, 'for update')
        ));

        $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoice->id,
            'amount' => '500.00',
            'method' => PaymentMethod::CARD->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['amount']);

        $this->assertSame('600.00', $invoice->fresh()->postedPaymentsTotal());
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_user_customer_invoice_accepts_payment_without_company_id(): void
    {
        $client = User::factory()->create();
        $client->assignRole('client');
        $invoice = $this->createInvoice([
            'customer_type' => 'user',
            'company_id' => null,
            'customer_user_id' => $client->id,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoice->id,
            'amount' => '125.00',
            'method' => PaymentMethod::CARD->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertCreated();

        $response->assertJsonPath('data.customer_type', 'user')
            ->assertJsonPath('data.company', null)
            ->assertJsonPath('data.customer_user.id', $client->id);
        $this->assertDatabaseHas('payments', [
            'id' => $response->json('data.id'),
            'company_id' => null,
            'customer_user_id' => $client->id,
        ]);
    }

    public function test_partial_payment_on_due_date_is_not_marked_overdue(): void
    {
        $invoice = $this->createInvoice(['due_date' => today()->toDateString()]);

        $this->actingAs($this->admin)->postJson('/api/v1/payments', [
            'invoice_id' => $invoice->id,
            'amount' => '100.00',
            'method' => PaymentMethod::OTHER->value,
            'paid_at' => now()->toIso8601String(),
        ])->assertCreated();

        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $invoice->fresh()->status);
    }

    public function test_user_with_reverse_permission_can_reverse_payment(): void
    {
        $reverser = User::factory()->create();
        $reverser->givePermissionTo(['view_payments', 'reverse_payments']);
        $invoice = $this->createInvoice(['status' => InvoiceStatus::PARTIALLY_PAID]);
        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => $invoice->currency,
            'amount' => '100.00',
            'status' => PaymentStatus::POSTED,
        ]);

        $this->actingAs($reverser)
            ->postJson("/api/v1/payments/{$payment->id}/reverse", [
                'reversal_reason' => 'Authorized reversal test.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::REVERSED->value);
    }

    public function test_blocks_ineligible_invoice_states_and_overpayment(): void
    {
        $draftInvoice = $this->createInvoice(['status' => InvoiceStatus::DRAFT]);
        $paidInvoice = $this->createInvoice(['status' => InvoiceStatus::PAID]);
        $invoice = $this->createInvoice();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $draftInvoice->id,
                'amount' => '100.00',
                'method' => PaymentMethod::CASH->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['invoice_id']);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $paidInvoice->id,
                'amount' => '100.00',
                'method' => PaymentMethod::CASH->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['invoice_id']);

        Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => $invoice->currency,
            'amount' => '900.00',
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => '101.00',
                'method' => PaymentMethod::BANK_TRANSFER->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_reversal_marks_payment_historical_and_recalculates_invoice(): void
    {
        $invoice = $this->createInvoice(['status' => InvoiceStatus::PARTIALLY_PAID]);
        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => $invoice->currency,
            'amount' => '400.00',
            'status' => PaymentStatus::POSTED,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/payments/{$payment->id}/reverse", [
                'reversal_reason' => 'Bank transfer returned.',
            ])
            ->assertOk();

        $response->assertJsonPath('data.status', PaymentStatus::REVERSED->value);
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => PaymentStatus::REVERSED->value,
            'reversed_by' => $this->admin->id,
            'reversal_reason' => 'Bank transfer returned.',
        ]);
        $this->assertEquals(InvoiceStatus::ISSUED, $invoice->fresh()->status);
    }

    public function test_partial_payment_on_past_due_invoice_keeps_overdue_status(): void
    {
        $invoice = $this->createInvoice([
            'status' => InvoiceStatus::OVERDUE,
            'due_date' => now()->subDays(3)->format('Y-m-d'),
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => '100.00',
                'method' => PaymentMethod::OTHER->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertCreated();

        $this->assertEquals(InvoiceStatus::OVERDUE, $invoice->fresh()->status);
    }

    public function test_list_supports_search_filters_and_sorting(): void
    {
        $invoiceA = $this->createInvoice(['reference' => 'LM-INV-2026-000001']);
        $invoiceB = $this->createInvoice(['reference' => 'LM-INV-2026-000002']);

        Payment::factory()->create([
            'reference' => 'LM-PAY-2026-000100',
            'invoice_id' => $invoiceA->id,
            'company_id' => $invoiceA->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => 'AED',
            'amount' => '200.00',
            'method' => PaymentMethod::CARD,
            'transaction_reference' => 'TX-AAA',
            'paid_at' => now()->subDays(2),
        ]);

        Payment::factory()->create([
            'reference' => 'LM-PAY-2026-000101',
            'invoice_id' => $invoiceB->id,
            'company_id' => $invoiceB->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => 'AED',
            'amount' => '300.00',
            'method' => PaymentMethod::BANK_TRANSFER,
            'transaction_reference' => 'TX-BBB',
            'paid_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->employee)
            ->getJson('/api/v1/payments?search=TX-BBB&method=bank_transfer&sort_by=amount&sort_order=desc')
            ->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.reference', 'LM-PAY-2026-000101');
    }

    public function test_list_returns_smart_allocation_summaries_without_double_counting_legacy_invoice(): void
    {
        $invoiceA = $this->createInvoice(['reference' => 'LM-INV-2026-000041']);
        $invoiceB = $this->createInvoice(['reference' => 'LM-INV-2026-000042']);
        $invoiceC = $this->createInvoice(['reference' => 'LM-INV-2026-000043']);

        $makePayment = function (string $reference, array $overrides = []): Payment {
            return Payment::factory()->create(array_merge([
                'reference' => $reference,
                'invoice_id' => null,
                'company_id' => $this->company->id,
                'recorded_by' => $this->admin->id,
                'status' => PaymentStatus::POSTED,
                'currency' => 'AED',
                'amount' => '500.000',
                'allocated_amount' => '500.000',
                'unallocated_amount' => '0.000',
            ], $overrides));
        };

        $single = $makePayment('LM-PAY-SMART-001');
        PaymentAllocation::create([
            'payment_id' => $single->id,
            'invoice_id' => $invoiceA->id,
            'amount' => '500.000',
        ]);

        $multiple = $makePayment('LM-PAY-SMART-002');
        foreach ([$invoiceA, $invoiceB] as $invoice) {
            PaymentAllocation::create([
                'payment_id' => $multiple->id,
                'invoice_id' => $invoice->id,
                'amount' => '250.000',
            ]);
        }

        $credit = $makePayment('LM-PAY-SMART-003', [
            'allocated_amount' => '0.000',
            'unallocated_amount' => '500.000',
        ]);

        $allReversed = $makePayment('LM-PAY-SMART-004', [
            'allocated_amount' => '0.000',
            'unallocated_amount' => '500.000',
        ]);
        PaymentAllocation::create([
            'payment_id' => $allReversed->id,
            'invoice_id' => $invoiceA->id,
            'amount' => '500.000',
            'reversed_at' => now(),
        ]);

        $legacy = $makePayment('LM-PAY-SMART-005', [
            'invoice_id' => $invoiceC->id,
        ]);

        $mixed = $makePayment('LM-PAY-SMART-006');
        PaymentAllocation::create([
            'payment_id' => $mixed->id,
            'invoice_id' => $invoiceB->id,
            'amount' => '250.000',
        ]);
        PaymentAllocation::create([
            'payment_id' => $mixed->id,
            'invoice_id' => $invoiceC->id,
            'amount' => '250.000',
            'reversed_at' => now(),
        ]);

        $reversedParent = $makePayment('LM-PAY-SMART-007', [
            'status' => PaymentStatus::REVERSED,
            'reversed_at' => now(),
        ]);
        PaymentAllocation::create([
            'payment_id' => $reversedParent->id,
            'invoice_id' => $invoiceA->id,
            'amount' => '500.000',
        ]);

        $rows = collect($this->actingAs($this->employee)
            ->getJson('/api/v1/payments?per_page=50')
            ->assertOk()
            ->json('data'))
            ->keyBy('reference');

        $this->assertSame(1, $rows['LM-PAY-SMART-001']['allocation_summary']['active_count']);
        $this->assertSame($invoiceA->reference, $rows['LM-PAY-SMART-001']['allocation_summary']['single_invoice']['reference']);
        $this->assertFalse($rows['LM-PAY-SMART-001']['allocation_summary']['has_reversed_allocations']);

        $this->assertSame(2, $rows['LM-PAY-SMART-002']['allocation_summary']['active_count']);
        $this->assertNull($rows['LM-PAY-SMART-002']['allocation_summary']['single_invoice']);

        $this->assertSame(0, $rows['LM-PAY-SMART-003']['allocation_summary']['active_count']);
        $this->assertSame('500.00', $rows['LM-PAY-SMART-003']['unallocated_amount']);

        $this->assertSame(0, $rows['LM-PAY-SMART-004']['allocation_summary']['active_count']);
        $this->assertTrue($rows['LM-PAY-SMART-004']['allocation_summary']['has_reversed_allocations']);

        $this->assertSame(1, $rows['LM-PAY-SMART-005']['allocation_summary']['active_count']);
        $this->assertSame($invoiceC->reference, $rows['LM-PAY-SMART-005']['allocation_summary']['single_invoice']['reference']);

        $this->assertSame(1, $rows['LM-PAY-SMART-006']['allocation_summary']['active_count']);
        $this->assertSame($invoiceB->reference, $rows['LM-PAY-SMART-006']['allocation_summary']['single_invoice']['reference']);
        $this->assertTrue($rows['LM-PAY-SMART-006']['allocation_summary']['has_reversed_allocations']);

        $this->assertSame(0, $rows['LM-PAY-SMART-007']['allocation_summary']['active_count']);
        $this->assertTrue($rows['LM-PAY-SMART-007']['allocation_summary']['has_reversed_allocations']);

        $this->assertSame($credit->id, $rows['LM-PAY-SMART-003']['id']);

        $invoiceBMatches = collect($this->actingAs($this->employee)
            ->getJson('/api/v1/payments?search=000042&per_page=50')
            ->assertOk()
            ->json('data'))
            ->pluck('reference');
        $this->assertTrue($invoiceBMatches->contains('LM-PAY-SMART-002'));
        $this->assertTrue($invoiceBMatches->contains('LM-PAY-SMART-006'));

        $invoiceCMatches = collect($this->actingAs($this->employee)
            ->getJson('/api/v1/payments?search=000043&per_page=50')
            ->assertOk()
            ->json('data'))
            ->pluck('reference');
        $this->assertTrue($invoiceCMatches->contains('LM-PAY-SMART-005'));
        $this->assertFalse($invoiceCMatches->contains('LM-PAY-SMART-006'));
    }

    public function test_payment_audit_and_activity_are_recorded(): void
    {
        $invoice = $this->createInvoice();

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => '100.00',
                'method' => PaymentMethod::BANK_TRANSFER->value,
                'paid_at' => now()->toIso8601String(),
            ])
            ->assertCreated();

        $paymentId = $response->json('data.id');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'payment.created',
            'subject_type' => Payment::class,
            'subject_id' => $paymentId,
            'user_id' => $this->admin->id,
        ]);

        $log = AuditLog::where('action', 'payment.created')
            ->where('subject_type', Payment::class)
            ->where('subject_id', $paymentId)
            ->firstOrFail();

        $this->assertSame($invoice->company_id, $log->new_values['company_id']);
        $this->assertSame('100.000', $log->new_values['amount']);
        $this->assertSame($invoice->reference, $log->request_context['metadata']['invoice_reference']);
    }

    public function test_delete_route_is_not_available(): void
    {
        $invoice = $this->createInvoice();
        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'recorded_by' => $this->admin->id,
            'currency' => $invoice->currency,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/payments/{$payment->id}")
            ->assertStatus(405);
    }
}

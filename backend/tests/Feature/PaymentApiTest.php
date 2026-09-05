<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;

use App\Models\Company;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->assertSame('100.00', $log->new_values['amount']);
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

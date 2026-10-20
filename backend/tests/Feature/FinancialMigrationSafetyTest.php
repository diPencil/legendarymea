<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinancialMigrationSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_widening_preserves_existing_numeric_values_exactly(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create([
            'subtotal' => '100.50',
            'discount_amount' => '0.00',
            'tax_amount' => '5.00',
            'total_amount' => '105.50',
        ]);

        $payment = Payment::create([
            'reference' => 'PAY-TEST-001',
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '100.50',
            'currency' => 'AED',
            'method' => 'bank_transfer',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);

        $rawAmount = DB::table('payments')->where('id', $payment->id)->value('amount');
        $this->assertSame('100.500', $rawAmount);
        $this->assertTrue(Decimal::compare($rawAmount, '100.50') === 0);
        $this->assertTrue(Decimal::compare($rawAmount, '100.500') === 0);
    }

    public function test_unsafe_rollback_is_blocked_when_third_decimal_data_exists(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create([
            'subtotal' => '50.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '50.00',
        ]);

        Payment::create([
            'reference' => 'PAY-TEST-PRECISION-001',
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '10.123',
            'currency' => 'KWD',
            'method' => 'bank_transfer',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);

        $migration = require database_path('migrations/2026_10_19_000003_expand_financial_amounts_for_currency_precision.php');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Rollback refused: payments.amount contains three-decimal monetary data');

        $migration->down();
    }

    public function test_rollback_is_blocked_when_invoice_total_has_third_decimal(): void
    {
        Invoice::factory()->create([
            'total_amount' => '10.125',
        ]);

        $migration = require database_path('migrations/2026_10_19_000003_expand_financial_amounts_for_currency_precision.php');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Rollback refused: invoices.total_amount contains three-decimal monetary data');

        $migration->down();
    }

    public function test_rollback_succeeds_when_all_data_has_at_most_two_decimals(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create([
            'subtotal' => '100.50',
            'discount_amount' => '0.00',
            'tax_amount' => '5.00',
            'total_amount' => '105.50',
        ]);

        Payment::create([
            'reference' => 'PAY-TEST-CLEAN-001',
            'invoice_id' => $invoice->id,
            'company_id' => $invoice->company_id,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '100.50',
            'currency' => 'AED',
            'method' => 'bank_transfer',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);

        $migration = require database_path('migrations/2026_10_19_000003_expand_financial_amounts_for_currency_precision.php');

        // Rollback should succeed safely without exception when data is 2 decimals
        $migration->down();

        // Check that column was changed to 2 decimals
        $paymentCol = DB::select("SHOW COLUMNS FROM payments WHERE Field = 'amount'");
        $this->assertStringContainsString('decimal(12,2)', strtolower($paymentCol[0]->Type));

        // Restore to 3 decimals
        $migration->up();
        $paymentColUp = DB::select("SHOW COLUMNS FROM payments WHERE Field = 'amount'");
        $this->assertStringContainsString('decimal(13,3)', strtolower($paymentColUp[0]->Type));
    }

    public function test_supplier_ledger_migration_detects_historical_duplicates(): void
    {
        $company = Company::factory()->create();
        $supplier = Supplier::create([
            'name' => 'Test Supplier',
            'type' => 'company',
            'linked_company_id' => $company->id,
            'status' => 'active',
            'reference' => 'SUP-TEST-001',
        ]);
        $account = SupplierBalanceAccount::create([
            'supplier_id' => $supplier->id,
            'currency' => 'AED',
            'current_balance' => '1000.000',
        ]);
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create();
        $invoiceItem = $invoice->items()->create([
            'item_type' => 'service',
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => '100.000',
            'line_total' => '100.000',
        ]);

        $migration = require database_path('migrations/2026_10_19_000002_add_supplier_ledger_integrity_constraints.php');

        // Drop unique constraints first to simulate pre-migration state
        $migration->down();

        // Insert duplicate entries with same invoice_id, invoice_item_id, and type
        DB::table('supplier_ledger_entries')->insert([
            [
                'reference' => 'SUPLED-TEST-001',
                'supplier_id' => $supplier->id,
                'supplier_balance_account_id' => $account->id,
                'currency' => 'AED',
                'type' => 'invoice_usage',
                'direction' => 'debit',
                'amount' => '100.000',
                'balance_before' => '1000.000',
                'balance_after' => '900.000',
                'invoice_id' => $invoice->id,
                'invoice_item_id' => $invoiceItem->id,
                'transaction_date' => now()->toDateString(),
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'reference' => 'SUPLED-TEST-002',
                'supplier_id' => $supplier->id,
                'supplier_balance_account_id' => $account->id,
                'currency' => 'AED',
                'type' => 'invoice_usage',
                'direction' => 'debit',
                'amount' => '100.000',
                'balance_before' => '900.000',
                'balance_after' => '800.000',
                'invoice_id' => $invoice->id,
                'invoice_item_id' => $invoiceItem->id,
                'transaction_date' => now()->toDateString(),
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        try {
            $migration->up();
            $this->fail('Expected RuntimeException was not thrown on duplicate ledger entries.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Supplier ledger duplicates must be reviewed before integrity constraints can be added.', $e->getMessage());
        } finally {
            DB::table('supplier_ledger_entries')->where('reference', 'SUPLED-TEST-002')->delete();
            $migration->up();
        }
    }

    public function test_payment_allows_nullable_company_and_unique_idempotency_key(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::factory()->create();

        $payment1 = Payment::create([
            'reference' => 'PAY-IDEM-001',
            'idempotency_key' => 'idempotency-token-123',
            'invoice_id' => $invoice->id,
            'company_id' => null, // Allowed
            'status' => PaymentStatus::POSTED->value,
            'amount' => '50.000',
            'currency' => 'USD',
            'method' => 'card',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);

        $this->assertNull($payment1->company_id);

        // Multiple null idempotency_key payments allowed
        $payment2 = Payment::create([
            'reference' => 'PAY-IDEM-002',
            'idempotency_key' => null,
            'invoice_id' => $invoice->id,
            'company_id' => null,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '25.000',
            'currency' => 'USD',
            'method' => 'card',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);
        $this->assertNotNull($payment2->id);

        // Duplicate non-null idempotency_key must be rejected by unique constraint
        $this->expectException(\Illuminate\Database\QueryException::class);
        Payment::create([
            'reference' => 'PAY-IDEM-003',
            'idempotency_key' => 'idempotency-token-123', // Duplicate
            'invoice_id' => $invoice->id,
            'company_id' => null,
            'status' => PaymentStatus::POSTED->value,
            'amount' => '10.000',
            'currency' => 'USD',
            'method' => 'card',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);
    }

    public function test_credit_application_request_key_is_database_enforced(): void
    {
        $payment = Payment::factory()->create();

        DB::table('payment_allocation_requests')->insert([
            'idempotency_key' => 'credit-request-unique-1',
            'payment_id' => $payment->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        DB::table('payment_allocation_requests')->insert([
            'idempotency_key' => 'credit-request-unique-1',
            'payment_id' => $payment->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

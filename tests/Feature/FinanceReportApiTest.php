<?php

namespace Tests\Feature;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\SupplierLedgerEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $superAdmin;
    protected User $viewer;
    protected User $noAccess;
    protected Company $company;
    protected Supplier $supplier;
    protected Employee $salesEmployee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole('super_admin');

        $this->viewer = User::factory()->create();
        $this->viewer->givePermissionTo('view_finance_reports');

        $this->noAccess = User::factory()->create();
        $this->company = Company::factory()->create();
        $this->salesEmployee = Employee::factory()->create([
            'user_id' => User::factory()->create(['name' => 'Sales Lead'])->id,
            'department' => 'Sales',
            'status' => 'active',
            'is_sales_eligible' => true,
        ]);

        $this->supplier = Supplier::create([
            'reference' => 'LM-SUP-SALES-000001',
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => $this->company->name,
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_authorization_is_enforced_for_finance_report_endpoints(): void
    {
        $this->getJson('/api/v1/finance-reports/overview')->assertUnauthorized();

        $this->actingAs($this->noAccess)
            ->getJson('/api/v1/finance-reports/overview')
            ->assertForbidden();

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/finance-reports/overview')
            ->assertOk();

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/finance-reports/overview')
            ->assertOk();
    }

    public function test_reports_return_expected_grouped_financial_data(): void
    {
        $invoice = Invoice::factory()->create([
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => $this->company->id,
            'sold_by_employee_id' => $this->salesEmployee->id,
            'status' => InvoiceStatus::ISSUED,
            'currency' => 'USD',
            'issue_date' => '2026-08-15',
            'due_date' => '2026-08-22',
            'subtotal' => '1000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '1000.00',
            'supplier_total_cost' => '600.00',
            'gross_profit' => '400.00',
            'gross_margin' => '40.00',
            'created_by' => $this->admin->id,
        ]);

        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'supplier_id' => $this->supplier->id,
            'service_type' => 'hotel',
            'quantity' => '2.000',
            'unit_price' => '500.00',
            'line_total' => '1000.00',
            'purchase_unit_cost' => '300.00',
            'purchase_currency' => 'USD',
            'exchange_rate' => '1.000000',
            'converted_unit_cost' => '300.00',
            'converted_line_cost' => '600.00',
            'line_profit' => '400.00',
            'line_margin' => '40.00',
        ]);

        Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'company_id' => $this->company->id,
            'customer_type' => InvoiceCustomerType::COMPANY,
            'recorded_by' => $this->admin->id,
            'currency' => 'USD',
            'amount' => '500.00',
            'method' => PaymentMethod::BANK_TRANSFER,
            'status' => PaymentStatus::POSTED,
            'paid_at' => '2026-08-18 10:00:00',
        ]);

        $account = SupplierBalanceAccount::create([
            'supplier_id' => $this->supplier->id,
            'currency' => 'USD',
            'current_balance' => '900.00',
        ]);

        SupplierLedgerEntry::create([
            'reference' => 'LM-SUPLED-2026-000001',
            'supplier_id' => $this->supplier->id,
            'supplier_balance_account_id' => $account->id,
            'currency' => 'USD',
            'type' => 'funding',
            'direction' => 'credit',
            'amount' => '1500.00',
            'balance_before' => '0.00',
            'balance_after' => '1500.00',
            'transaction_date' => '2026-08-10',
            'created_by' => $this->admin->id,
        ]);

        SupplierLedgerEntry::create([
            'reference' => 'LM-SUPLED-2026-000002',
            'supplier_id' => $this->supplier->id,
            'supplier_balance_account_id' => $account->id,
            'currency' => 'USD',
            'type' => 'invoice_usage',
            'direction' => 'debit',
            'amount' => '600.00',
            'balance_before' => '1500.00',
            'balance_after' => '900.00',
            'transaction_date' => '2026-08-15',
            'invoice_id' => $invoice->id,
            'invoice_item_id' => $invoice->items()->first()->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/finance-reports/overview?currency=usd&date_from=2026-08-01&date_to=2026-08-31')
            ->assertOk()
            ->assertJsonPath('overview.sales.0.amount', '1000.00')
            ->assertJsonPath('overview.gross_profit.0.amount', '400.00')
            ->assertJsonPath('cash_flow.cash_in.0.amount', '500.00')
            ->assertJsonPath('cash_flow.cash_out.0.amount', '1500.00')
            ->assertJsonPath('cash_flow.cogs.0.amount', '600.00')
            ->assertJsonPath('receivables.outstanding.0.amount', '500.00');

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/finance-reports/sales-team?sold_by_employee_id=' . $this->salesEmployee->id)
            ->assertOk()
            ->assertJsonPath('0.employee.id', $this->salesEmployee->id)
            ->assertJsonPath('0.profit.0.amount', '400.00');

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/finance-reports/service-breakdown')
            ->assertOk()
            ->assertJsonPath('0.service_type', 'hotel')
            ->assertJsonPath('0.sales.0.amount', '1000.00');

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/finance-reports/suppliers?supplier_id=' . $this->supplier->id)
            ->assertOk()
            ->assertJsonPath('0.supplier.id', $this->supplier->id)
            ->assertJsonPath('0.currencies.0.available', '900.00');
    }
}

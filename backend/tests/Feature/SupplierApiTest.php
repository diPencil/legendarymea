<?php

namespace Tests\Feature;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\SupplierLedgerType;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $viewer;
    protected User $noAccess;
    protected Company $company;
    protected User $clientUser;
    protected Employee $salesEmployee;

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
        $this->clientUser = User::factory()->create();
        $this->salesEmployee = Employee::factory()->create([
            'user_id' => User::factory()->create()->id,
            'department' => 'Sales',
            'status' => 'active',
            'is_sales_eligible' => true,
        ]);
    }

    public function test_admin_can_create_company_supplier_and_list_it(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/suppliers', [
                'type' => 'company',
                'linked_company_id' => $this->company->id,
                'status' => 'active',
            ])
            ->assertCreated();

        $supplierId = $response->json('data.id');

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplierId,
            'linked_company_id' => $this->company->id,
            'type' => 'company',
            'status' => 'active',
        ]);

        $this->actingAs($this->viewer)
            ->getJson('/api/v1/suppliers?search=' . $this->company->name)
            ->assertOk()
            ->assertJsonPath('data.0.id', $supplierId);
    }

    public function test_duplicate_active_company_supplier_is_rejected(): void
    {
        Supplier::create([
            'reference' => 'LM-SUP-CO-000001',
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => $this->company->name,
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/suppliers', [
                'type' => 'company',
                'linked_company_id' => $this->company->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['linked_company_id']);
    }

    public function test_supplier_can_be_funded_and_balance_is_returned(): void
    {
        $supplier = Supplier::create([
            'reference' => 'LM-SUP-HOTEL-000001',
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => $this->company->name,
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/suppliers/{$supplier->id}/fund", [
                'amount' => '500.00',
                'currency' => 'USD',
                'transaction_date' => now()->toDateString(),
                'payment_method' => PaymentMethod::BANK_TRANSFER->value,
                'external_reference' => 'FUND-001',
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', SupplierLedgerType::FUNDING->value)
            ->assertJsonPath('data.balance_after', '500.00');

        $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}")
            ->assertOk()
            ->assertJsonPath('data.balances.0.currency', 'USD')
            ->assertJsonPath('data.balances.0.available', '500.00');
    }

    public function test_issuing_finance_v2_invoice_consumes_supplier_balance_and_shows_ledger(): void
    {
        $supplier = Supplier::create([
            'reference' => 'LM-SUP-DMC-000001',
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => $this->company->name,
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->postJson("/api/v1/suppliers/{$supplier->id}/fund", [
            'amount' => '1000.00',
            'currency' => 'USD',
            'transaction_date' => now()->toDateString(),
        ])->assertCreated();

        $invoiceResponse = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_type' => InvoiceCustomerType::COMPANY->value,
                'company_id' => $this->company->id,
                'sold_by_employee_id' => $this->salesEmployee->id,
                'currency' => 'USD',
                'due_date' => now()->addDays(7)->toDateString(),
                'items' => [[
                    'description' => 'Ground handling',
                    'service_type' => 'transfers',
                    'service_name_snapshot' => 'VIP transport',
                    'supplier_id' => $supplier->id,
                    'quantity' => 2,
                    'unit_price' => 400,
                    'purchase_unit_cost' => 150,
                    'purchase_currency' => 'USD',
                    'exchange_rate' => 1,
                ]],
            ])
            ->assertCreated();

        $invoiceId = $invoiceResponse->json('data.id');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoiceId}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', InvoiceStatus::ISSUED->value);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/suppliers/{$supplier->id}")
            ->assertOk()
            ->assertJsonPath('data.balances.0.used', '300.00')
            ->assertJsonPath('data.balances.0.available', '700.00')
            ->assertJsonCount(2, 'data.ledger');
    }
}

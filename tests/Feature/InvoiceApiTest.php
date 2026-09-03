<?php

namespace Tests\Feature;

use App\Enums\ActiveServiceStatus;
use App\Enums\ContractStatus;
use App\Enums\InvoiceStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Contract;
use App\Models\CrmActivity;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\ServiceCatalog;
use App\Models\Supplier;
use App\Models\SupplierBalanceAccount;
use App\Models\SupplierLedgerEntry;
use App\Models\User;
use App\Enums\SupplierLedgerType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceApiTest extends TestCase
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

    private function validItems(): array
    {
        return [
            ['description' => 'Service Fee', 'quantity' => 1, 'unit_price' => 1000.00],
        ];
    }

    private function invoiceCatalogService(array $overrides = []): ServiceCatalog
    {
        return ServiceCatalog::query()->create(array_merge([
            'code' => 'flight_arrangements',
            'name_en' => 'Flight Arrangements',
            'name_ar' => 'ترتيبات الطيران',
            'category' => 'tourism',
            'active' => true,
            'show_in_contact' => true,
            'available_for_invoice' => true,
            'available_for_active_service' => true,
            'sort_order' => 10,
        ], $overrides));
    }

    private function activeSalesEmployee(array $overrides = []): Employee
    {
        return Employee::factory()->create(array_merge([
            'department' => 'Sales',
            'status' => 'active',
            'is_sales_eligible' => true,
        ], $overrides));
    }

    private function activeSupplier(array $overrides = []): Supplier
    {
        return Supplier::create(array_merge([
            'reference' => 'LM-SUP-TEST-' . fake()->unique()->numerify('######'),
            'type' => 'company',
            'linked_company_id' => $this->company->id,
            'name' => 'Test Supplier',
            'status' => 'active',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ], $overrides));
    }

    private function createDraftInvoice(array $overrides = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => '1000.00',
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => '1000.00',
        ], $overrides));
    }

    // ===========================================================
    // AUTHORIZATION
    // ===========================================================

    public function test_unauthenticated_blocked(): void
    {
        $this->getJson('/api/v1/invoices')->assertUnauthorized();
    }

    public function test_view_permission_can_list_and_show(): void
    {
        $invoice = $this->createDraftInvoice();

        $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices')
            ->assertOk();

        $this->actingAs($this->employee)
            ->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk();
    }

    public function test_view_only_cannot_mutate(): void
    {
        $invoice = $this->createDraftInvoice();

        $this->actingAs($this->employee)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertForbidden();

        $this->actingAs($this->employee)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertForbidden();
    }

    public function test_no_access_user_blocked(): void
    {
        $this->actingAs($this->noAccess)
            ->getJson('/api/v1/invoices')
            ->assertForbidden();
    }

    // ===========================================================
    // CREATE
    // ===========================================================

    public function test_creates_draft_with_correct_reference(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $data = $response->json('data');
        $this->assertEquals('draft', $data['status']);
        $this->assertMatchesRegularExpression('/^LM-INV-\d{4}-\d{6}$/', $data['reference']);
        $this->assertDatabaseHas('invoices', ['reference' => $data['reference'], 'status' => 'draft']);
    }

    public function test_authenticated_creator_is_set(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('invoices', [
            'reference' => $response->json('data.reference'),
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_company_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id']);
    }

    public function test_standalone_company_invoice_works(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'SAR',
                'items' => [
                    ['description' => 'Consulting Fee', 'quantity' => 2, 'unit_price' => 500],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.currency', 'SAR');
    }

    public function test_optional_contract_valid(): void
    {
        $contract = Contract::factory()->create(['company_id' => $this->company->id]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.contract.id', $contract->id);
    }

    public function test_cross_company_contract_rejected(): void
    {
        $otherCompany = Company::factory()->create();
        $contract = Contract::factory()->create(['company_id' => $otherCompany->id]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['contract_id']);
    }

    public function test_optional_active_service_valid(): void
    {
        $contract = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::ACTIVE]);
        $service = ActiveService::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => ActiveServiceStatus::ACTIVE,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'active_service_id' => $service->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.active_service.id', $service->id);
    }

    public function test_user_invoice_persists_customer_mapping_and_type_switch_clears_company_relationships(): void
    {
        $client = User::factory()->create([
            'name' => 'Client User',
            'email' => 'client@example.test',
        ]);
        $client->assignRole('client');
        $contract = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::ACTIVE]);
        $activeService = ActiveService::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => ActiveServiceStatus::ACTIVE,
        ]);

        $created = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_type' => 'company',
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'active_service_id' => $activeService->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $invoiceId = $created->json('data.id');

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoiceId}", [
                'customer_type' => 'user',
                'customer_user_id' => $client->id,
            ])
            ->assertOk();

        $response->assertJsonPath('data.customer_type', 'user')
            ->assertJsonPath('data.company', null)
            ->assertJsonPath('data.customer_user.id', $client->id)
            ->assertJsonPath('data.customer.name', 'Client User')
            ->assertJsonPath('data.customer.email', 'client@example.test')
            ->assertJsonPath('data.contract', null)
            ->assertJsonPath('data.active_service', null);

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'customer_type' => 'user',
            'company_id' => null,
            'customer_user_id' => $client->id,
            'contract_id' => null,
            'active_service_id' => null,
        ]);
    }

    public function test_sales_owner_must_be_active_sales_department_employee(): void
    {
        $salesEmployee = $this->activeSalesEmployee();
        $operationsEmployee = $this->activeSalesEmployee(['department' => 'Operations']);
        $inactiveSalesEmployee = $this->activeSalesEmployee(['status' => 'inactive']);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_type' => 'company',
                'company_id' => $this->company->id,
                'sold_by_employee_id' => $salesEmployee->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.sold_by_employee.id', $salesEmployee->id);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_type' => 'company',
                'company_id' => $this->company->id,
                'sold_by_employee_id' => $operationsEmployee->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sold_by_employee_id']);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_type' => 'company',
                'company_id' => $this->company->id,
                'sold_by_employee_id' => $inactiveSalesEmployee->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sold_by_employee_id']);
    }

    public function test_cross_company_active_service_rejected(): void
    {
        $otherCompany = Company::factory()->create();
        $contract = Contract::factory()->create(['company_id' => $otherCompany->id, 'status' => ContractStatus::ACTIVE]);
        $service = ActiveService::factory()->create(['company_id' => $otherCompany->id, 'contract_id' => $contract->id]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'active_service_id' => $service->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['active_service_id']);
    }

    public function test_mismatched_contract_and_active_service_rejected(): void
    {
        $contract1 = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::ACTIVE]);
        $contract2 = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::ACTIVE]);
        $service = ActiveService::factory()->create(['company_id' => $this->company->id, 'contract_id' => $contract2->id]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract1->id,
                'active_service_id' => $service->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['active_service_id']);
    }

    public function test_status_spoof_blocked(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'status' => 'issued',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_creator_spoof_blocked(): void
    {
        $otherUser = User::factory()->create();

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'created_by' => $otherUser->id,
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('invoices', [
            'reference' => $response->json('data.reference'),
            'created_by' => $this->admin->id,
        ]);
    }

    // ===========================================================
    // ITEMS
    // ===========================================================

    public function test_items_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }

    public function test_at_least_one_item_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }

    public function test_item_description_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [['quantity' => 1, 'unit_price' => 100]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.description']);
    }

    public function test_item_quantity_must_be_positive(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [['description' => 'Test', 'quantity' => 0, 'unit_price' => 100]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.quantity']);
    }

    public function test_item_unit_price_can_be_zero(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [['description' => 'Free Item', 'quantity' => 1, 'unit_price' => 0]],
            ])
            ->assertCreated();
    }

    public function test_server_calculates_line_total(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [['description' => 'Item', 'quantity' => 3, 'unit_price' => 100]],
            ])
            ->assertCreated();

        $item = $response->json('data.items.0');
        $this->assertEquals('300.0000', $item['line_total']);
    }

    public function test_multiple_items_subtotal_calculated_correctly(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [
                    ['description' => 'Item A', 'quantity' => 2, 'unit_price' => 150],
                    ['description' => 'Item B', 'quantity' => 3, 'unit_price' => 100],
                ],
            ])
            ->assertCreated();

        $this->assertEquals('600.00', $response->json('data.subtotal'));
    }

    public function test_fractional_quantity_safe(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [['description' => 'Fractional', 'quantity' => 1.5, 'unit_price' => 200]],
            ])
            ->assertCreated();

        $this->assertEquals('300.0000', $response->json('data.items.0.line_total'));
    }

    // ===========================================================
    // FINANCIALS
    // ===========================================================

    public function test_subtotal_server_calculated(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'subtotal' => 999999, // client attempt to override
                'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 500]],
            ])
            ->assertCreated();

        $this->assertEquals('500.00', $response->json('data.subtotal'));
    }

    public function test_discount_default_zero(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertEquals('0.00', $response->json('data.discount_amount'));
    }

    public function test_tax_default_zero(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertEquals('0.00', $response->json('data.tax_amount'));
    }

    public function test_discount_applied_correctly(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'discount_amount' => 100,
                'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000]],
            ])
            ->assertCreated();

        $this->assertEquals('900.00', $response->json('data.total_amount'));
    }

    public function test_tax_applied_correctly(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'tax_amount' => 50,
                'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000]],
            ])
            ->assertCreated();

        $this->assertEquals('1050.00', $response->json('data.total_amount'));
    }

    public function test_total_formula_correct(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'discount_amount' => 100,
                'tax_amount' => 50,
                'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000]],
            ])
            ->assertCreated();

        // subtotal=1000, discount=100, tax=50, total=950
        $this->assertEquals('1000.00', $response->json('data.subtotal'));
        $this->assertEquals('950.00', $response->json('data.total_amount'));
    }

    public function test_negative_discount_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'discount_amount' => -10,
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['discount_amount']);
    }

    public function test_negative_tax_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'tax_amount' => -10,
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tax_amount']);
    }

    public function test_negative_total_rejected(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'discount_amount' => 2000, // exceeds subtotal of 1000
                'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000]],
            ])
            ->assertUnprocessable();
    }

    public function test_currency_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['currency']);
    }

    public function test_currency_must_be_3_chars(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'US',
                'items' => $this->validItems(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['currency']);
    }

    // ===========================================================
    // DATES
    // ===========================================================

    public function test_draft_issue_date_nullable(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertNull($response->json('data.issue_date'));
    }

    public function test_due_date_nullable(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertNull($response->json('data.due_date'));
    }

    public function test_invoice_item_accepts_and_returns_invoice_catalog_service(): void
    {
        $service = $this->invoiceCatalogService();

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Traveler description',
                    'service_catalog_id' => $service->id,
                    'quantity' => 1,
                    'unit_price' => 1000,
                ]],
            ])
            ->assertCreated();

        $this->assertSame($service->id, $response->json('data.items.0.service_catalog_id'));
        $this->assertSame('Flight Arrangements', $response->json('data.items.0.service_catalog.name_en'));
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $response->json('data.id'),
            'description' => 'Traveler description',
            'service_catalog_id' => $service->id,
        ]);
    }

    public function test_invoice_item_restores_service_name_and_same_currency_fx_defaults(): void
    {
        $service = $this->invoiceCatalogService();

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Item description',
                    'service_catalog_id' => $service->id,
                    'service_name_snapshot' => 'Hilton Riyadh - 3 Nights',
                    'quantity' => 2,
                    'unit_price' => 1000,
                    'purchase_unit_cost' => 100,
                    'purchase_currency' => 'AED',
                    'exchange_rate' => 9,
                ]],
            ])
            ->assertCreated();

        $this->assertSame('Hilton Riyadh - 3 Nights', $response->json('data.items.0.service_name_snapshot'));
        $this->assertSame('Item description', $response->json('data.items.0.description'));
        $this->assertSame('1.00000000', $response->json('data.items.0.exchange_rate'));
        $this->assertSame('100.0000', $response->json('data.items.0.converted_unit_cost'));
        $this->assertSame('200.0000', $response->json('data.items.0.converted_line_cost'));
    }

    public function test_invoice_item_converts_purchase_currency_to_invoice_currency(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Hotel stay',
                    'service_name_snapshot' => 'Hilton Riyadh - 3 Nights',
                    'quantity' => 2,
                    'unit_price' => 1000,
                    'purchase_unit_cost' => 100,
                    'purchase_currency' => 'USD',
                    'exchange_rate' => 3.67,
                ]],
            ])
            ->assertCreated();

        $this->assertSame('USD', $response->json('data.items.0.purchase_currency'));
        $this->assertSame('3.67000000', $response->json('data.items.0.exchange_rate'));
        $this->assertSame('367.0000', $response->json('data.items.0.converted_unit_cost'));
        $this->assertSame('734.0000', $response->json('data.items.0.converted_line_cost'));
    }

    public function test_invoice_item_cost_uses_full_precision_quantity_times_purchase_cost_times_fx(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Precision service',
                    'quantity' => 3,
                    'unit_price' => 100,
                    'purchase_unit_cost' => 10.1111,
                    'purchase_currency' => 'USD',
                    'exchange_rate' => 3.3333,
                ]],
            ])
            ->assertCreated();

        $this->assertSame('300.0000', $response->json('data.items.0.line_total'));
        $this->assertSame('33.7033', $response->json('data.items.0.converted_unit_cost'));
        $this->assertSame('101.1100', $response->json('data.items.0.converted_line_cost'));
        $this->assertSame('198.8900', $response->json('data.items.0.line_profit'));
        $this->assertSame('101.11', $response->json('data.supplier_total_cost'));
        $this->assertSame('198.89', $response->json('data.gross_profit'));
    }

    public function test_supplier_purchase_fields_persist_and_customer_view_hides_internal_finance(): void
    {
        $supplier = $this->activeSupplier();
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_invoices');

        $created = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Customer-facing description',
                    'service_name_snapshot' => 'Hilton Riyadh - 3 Nights',
                    'supplier_id' => $supplier->id,
                    'quantity' => 2,
                    'unit_price' => 500,
                    'purchase_unit_cost' => 123.4567,
                    'purchase_currency' => 'USD',
                    'exchange_rate' => 3.67,
                ]],
            ])
            ->assertCreated();

        $invoiceId = $created->json('data.id');

        $adminItem = $this->actingAs($this->admin)
            ->getJson("/api/v1/invoices/{$invoiceId}")
            ->assertOk()
            ->json('data.items.0');

        $this->assertSame($supplier->id, $adminItem['supplier']['id']);
        $this->assertSame('123.4567', $adminItem['purchase_unit_cost']);
        $this->assertSame('USD', $adminItem['purchase_currency']);
        $this->assertSame('3.67000000', $adminItem['exchange_rate']);
        $this->assertSame('Hilton Riyadh - 3 Nights', $adminItem['service_name_snapshot']);
        $this->assertSame('Customer-facing description', $adminItem['description']);

        $viewerItem = $this->actingAs($viewer)
            ->getJson("/api/v1/invoices/{$invoiceId}")
            ->assertOk()
            ->json('data.items.0');

        $this->assertArrayNotHasKey('supplier', $viewerItem);
        $this->assertArrayNotHasKey('purchase_unit_cost', $viewerItem);
        $this->assertArrayNotHasKey('purchase_currency', $viewerItem);
        $this->assertArrayNotHasKey('exchange_rate', $viewerItem);
        $this->assertArrayNotHasKey('converted_line_cost', $viewerItem);
        $this->assertArrayNotHasKey('line_profit', $viewerItem);
    }

    public function test_invoice_can_be_created_listed_opened_edited_and_reopened(): void
    {
        $service = $this->invoiceCatalogService();

        $created = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [[
                    'description' => 'Initial description',
                    'service_catalog_id' => $service->id,
                    'service_name_snapshot' => 'Initial service name',
                    'quantity' => 1,
                    'unit_price' => 500,
                ]],
            ])
            ->assertCreated();

        $invoiceId = $created->json('data.id');
        $reference = $created->json('data.reference');

        $this->actingAs($this->admin)
            ->getJson('/api/v1/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.reference', $reference);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/invoices/{$invoiceId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.service_name_snapshot', 'Initial service name');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoiceId}", [
                'currency' => 'USD',
                'items' => [[
                    'description' => 'Edited description',
                    'service_name_snapshot' => 'Edited service name',
                    'quantity' => 2,
                    'unit_price' => 300,
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.currency', 'USD');

        $this->actingAs($this->admin)
            ->getJson("/api/v1/invoices/{$invoiceId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.service_name_snapshot', 'Edited service name')
            ->assertJsonPath('data.items.0.description', 'Edited description');
    }

    // ===========================================================
    // UPDATE
    // ===========================================================

    public function test_draft_update_works(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Old Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'currency' => 'USD',
                'items' => [['description' => 'New Item', 'quantity' => 2, 'unit_price' => 500]],
            ])
            ->assertOk()
            ->assertJsonPath('data.currency', 'USD');
    }

    public function test_items_update_recalculates_totals(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'items' => [['description' => 'Updated', 'quantity' => 3, 'unit_price' => 200]],
            ])
            ->assertOk();

        $this->assertEquals('600.00', $response->json('data.subtotal'));
        $this->assertEquals('600.00', $response->json('data.total_amount'));
    }

    public function test_draft_update_persists_invoice_catalog_service(): void
    {
        $service = $this->invoiceCatalogService(['code' => 'hotel_accommodation', 'name_en' => 'Hotels & Accommodation']);
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Old Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'items' => [[
                    'description' => 'Updated description',
                    'service_catalog_id' => $service->id,
                    'quantity' => 2,
                    'unit_price' => 500,
                ]],
            ])
            ->assertOk();

        $this->assertSame($service->id, $response->json('data.items.0.service_catalog_id'));
        $this->assertSame('Hotels & Accommodation', $response->json('data.items.0.service_catalog.name_en'));
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'description' => 'Updated description',
            'service_catalog_id' => $service->id,
        ]);
    }

    public function test_nullable_clearing_works(): void
    {
        $invoice = $this->createDraftInvoice([
            'notes' => 'Some notes',
            'contract_id' => null,
        ]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100, 'subtotal' => 100, 'total_amount' => 100]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'notes' => null,
            ])
            ->assertOk();

        $this->assertNull($response->json('data.notes'));
    }

    public function test_immutable_reference_on_update(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);
        $originalRef = $invoice->reference;

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'reference' => 'FAKE-REF',
            ])
            ->assertOk();

        $this->assertEquals($originalRef, $response->json('data.reference'));
    }

    public function test_generic_status_mutation_blocked(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'status' => 'issued',
            ])
            ->assertOk();

        // Status should remain draft — field is ignored
        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_admin_can_update_issued_invoice(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::ISSUED, 'issue_date' => now()]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertOk()
            ->assertJsonPath('data.currency', 'USD');
    }

    public function test_non_admin_cannot_update_issued_invoice_even_with_manage_permission(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::ISSUED, 'issue_date' => now()]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);
        $manager = User::factory()->create();
        $manager->givePermissionTo(['view_invoices', 'manage_invoices']);

        $this->actingAs($manager)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertForbidden();
    }

    public function test_paid_invoice_update_blocked_for_admin(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::PAID, 'issue_date' => now()]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertUnprocessable();
    }

    public function test_cancelled_invoice_update_blocked(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::CANCELLED]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertUnprocessable();
    }

    // ===========================================================
    // ISSUE LIFECYCLE
    // ===========================================================

    public function test_draft_to_issued(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', 'issued');
    }

    public function test_issue_sets_issue_date_if_null(): void
    {
        $invoice = $this->createDraftInvoice(['issue_date' => null]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/issue")
            ->assertOk();

        $this->assertNotNull($response->json('data.issue_date'));
    }

    public function test_issued_invoice_commercial_editing_blocked(): void
    {
        $supplier = $this->activeSupplier();
        SupplierBalanceAccount::create([
            'supplier_id' => $supplier->id,
            'currency' => 'AED',
            'current_balance' => '500.00',
        ]);

        $invoice = $this->createDraftInvoice();
        $invoice->items()->create([
            'description' => 'Item',
            'supplier_id' => $supplier->id,
            'quantity' => 1,
            'unit_price' => 1000,
            'line_total' => 1000,
            'purchase_unit_cost' => 100,
            'purchase_currency' => 'AED',
            'exchange_rate' => 1,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/issue")
            ->assertOk();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'USD', 'items' => $this->validItems()])
            ->assertUnprocessable();
    }

    public function test_issuing_invoice_consumes_supplier_balance_once_and_draft_consumes_nothing(): void
    {
        $supplier = $this->activeSupplier();
        SupplierBalanceAccount::create([
            'supplier_id' => $supplier->id,
            'currency' => 'USD',
            'current_balance' => '500.00',
        ]);

        $invoiceResponse = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'issue_date' => '2026-09-02',
                'items' => [[
                    'description' => 'Supplier-backed booking',
                    'supplier_id' => $supplier->id,
                    'quantity' => 2,
                    'unit_price' => 400,
                    'purchase_unit_cost' => 150,
                    'purchase_currency' => 'USD',
                    'exchange_rate' => 3.67,
                ]],
            ])
            ->assertCreated();

        $invoiceId = $invoiceResponse->json('data.id');
        $itemId = $invoiceResponse->json('data.items.0.id');

        $this->assertSame(0, SupplierLedgerEntry::query()
            ->where('invoice_id', $invoiceId)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->count());
        $this->assertSame('500.00', SupplierBalanceAccount::where('supplier_id', $supplier->id)->where('currency', 'USD')->value('current_balance'));

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoiceId}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', InvoiceStatus::ISSUED->value)
            ->assertJsonPath('data.issue_date', '2026-09-02');

        $this->assertDatabaseHas('supplier_ledger_entries', [
            'invoice_id' => $invoiceId,
            'invoice_item_id' => $itemId,
            'supplier_id' => $supplier->id,
            'currency' => 'USD',
            'type' => SupplierLedgerType::INVOICE_USAGE->value,
            'amount' => '300.00',
        ]);
        $this->assertSame(1, SupplierLedgerEntry::query()
            ->where('invoice_id', $invoiceId)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->count());
        $this->assertSame('200.00', SupplierBalanceAccount::where('supplier_id', $supplier->id)->where('currency', 'USD')->value('current_balance'));

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoiceId}/issue")
            ->assertUnprocessable();
        $this->assertSame(1, SupplierLedgerEntry::query()
            ->where('invoice_id', $invoiceId)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->count());
    }

    public function test_insufficient_supplier_balance_rolls_back_entire_issue_transaction(): void
    {
        $fundedSupplier = $this->activeSupplier(['reference' => 'LM-SUP-FUNDED-000001', 'name' => 'Funded Supplier']);
        $unfundedSupplier = $this->activeSupplier(['reference' => 'LM-SUP-UNFUNDED-000001', 'name' => 'Unfunded Supplier']);
        SupplierBalanceAccount::create([
            'supplier_id' => $fundedSupplier->id,
            'currency' => 'USD',
            'current_balance' => '500.00',
        ]);

        $invoiceResponse = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => [
                    [
                        'description' => 'First supplier item',
                        'supplier_id' => $fundedSupplier->id,
                        'quantity' => 1,
                        'unit_price' => 500,
                        'purchase_unit_cost' => 100,
                        'purchase_currency' => 'USD',
                        'exchange_rate' => 3.67,
                    ],
                    [
                        'description' => 'Second supplier item',
                        'supplier_id' => $unfundedSupplier->id,
                        'quantity' => 1,
                        'unit_price' => 500,
                        'purchase_unit_cost' => 100,
                        'purchase_currency' => 'USD',
                        'exchange_rate' => 3.67,
                    ],
                ],
            ])
            ->assertCreated();

        $invoiceId = $invoiceResponse->json('data.id');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoiceId}/issue")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'status' => InvoiceStatus::DRAFT->value,
        ]);
        $this->assertSame('500.00', SupplierBalanceAccount::where('supplier_id', $fundedSupplier->id)->where('currency', 'USD')->value('current_balance'));
        $this->assertSame(0, SupplierLedgerEntry::query()
            ->where('invoice_id', $invoiceId)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->count());
    }

    // ===========================================================
    // CANCEL LIFECYCLE
    // ===========================================================

    public function test_draft_to_cancelled(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_issued_cancel_blocked(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::ISSUED, 'issue_date' => now()]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/cancel")
            ->assertUnprocessable();
    }

    public function test_overdue_cancel_blocked(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::OVERDUE,
            'issue_date' => now()->subDays(30),
            'due_date' => now()->subDays(10),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/cancel")
            ->assertUnprocessable();
    }

    // ===========================================================
    // OVERDUE LIFECYCLE
    // ===========================================================

    public function test_issued_past_due_can_be_marked_overdue(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(30),
            'due_date' => now()->subDay(),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-overdue")
            ->assertOk()
            ->assertJsonPath('data.status', 'overdue');
    }

    public function test_future_due_date_cannot_be_marked_overdue(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(5),
            'due_date' => now()->addDays(10),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-overdue")
            ->assertUnprocessable();
    }

    public function test_missing_due_date_cannot_be_marked_overdue(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(5),
            'due_date' => null,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-overdue")
            ->assertUnprocessable();
    }

    public function test_draft_cannot_be_marked_overdue(): void
    {
        $invoice = $this->createDraftInvoice(['due_date' => now()->subDay()]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-overdue")
            ->assertUnprocessable();
    }

    // ===========================================================
    // PAYMENT STATUS PROTECTION
    // ===========================================================

    public function test_cannot_manually_set_partially_paid_via_update(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'status' => 'partially_paid',
            ])
            ->assertOk();

        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_cannot_manually_set_paid_via_update(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'status' => 'paid',
            ])
            ->assertOk();

        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_no_pay_endpoint_exists(): void
    {
        $invoice = $this->createDraftInvoice();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/pay", [])
            ->assertNotFound();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-paid", [])
            ->assertNotFound();
    }

    // ===========================================================
    // DELETE
    // ===========================================================

    public function test_draft_soft_delete_allowed(): void
    {
        $invoice = $this->createDraftInvoice();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
    }

    public function test_cancelled_soft_delete_allowed(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::CANCELLED]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
    }

    public function test_issued_delete_blocked(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::ISSUED, 'issue_date' => now()]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertUnprocessable();
    }

    public function test_paid_delete_blocked(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::PAID]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertUnprocessable();
    }

    public function test_overdue_delete_blocked(): void
    {
        $invoice = $this->createDraftInvoice(['status' => InvoiceStatus::OVERDUE]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertUnprocessable();
    }

    public function test_deleted_absent_from_list(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->delete();

        $response = $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertNotContains($invoice->id, $ids);
    }

    // ===========================================================
    // LIST / FILTERS / PAGINATION
    // ===========================================================

    public function test_list_pagination(): void
    {
        Invoice::factory()->count(5)->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id]);

        $response = $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices?per_page=2')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertNotNull($response->json('meta.total'));
    }

    public function test_status_filter(): void
    {
        Invoice::factory()->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id, 'status' => InvoiceStatus::DRAFT]);
        Invoice::factory()->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id, 'status' => InvoiceStatus::ISSUED, 'issue_date' => now()]);

        $response = $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices?status=draft')
            ->assertOk();

        foreach ($response->json('data') as $inv) {
            $this->assertEquals('draft', $inv['status']);
        }
    }

    public function test_company_filter(): void
    {
        $other = Company::factory()->create();
        Invoice::factory()->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id]);
        Invoice::factory()->create(['company_id' => $other->id, 'created_by' => $this->admin->id]);

        $response = $this->actingAs($this->employee)
            ->getJson("/api/v1/invoices?company_id={$this->company->id}")
            ->assertOk();

        foreach ($response->json('data') as $inv) {
            $this->assertEquals($this->company->id, $inv['company']['id']);
        }
    }

    public function test_currency_filter(): void
    {
        Invoice::factory()->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id, 'currency' => 'AED']);
        Invoice::factory()->create(['company_id' => $this->company->id, 'created_by' => $this->admin->id, 'currency' => 'SAR']);

        $response = $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices?currency=AED')
            ->assertOk();

        foreach ($response->json('data') as $inv) {
            $this->assertEquals('AED', $inv['currency']);
        }
    }

    public function test_sorting_allowlist(): void
    {
        // Invalid sort field should not cause error, should default
        $this->actingAs($this->employee)
            ->getJson('/api/v1/invoices?sort_by=malicious_field&sort_order=asc')
            ->assertOk();
    }

    // ===========================================================
    // RESOURCE SHAPE
    // ===========================================================

    public function test_resource_contains_required_fields(): void
    {
        $contract = Contract::factory()->create(['company_id' => $this->company->id]);
        $invoice = $this->createDraftInvoice(['contract_id' => $contract->id]);
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $response = $this->actingAs($this->employee)
            ->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk();

        $data = $response->json('data');
        $this->assertArrayHasKey('id', $data);
        $this->assertArrayHasKey('reference', $data);
        $this->assertArrayHasKey('status', $data);
        $this->assertArrayHasKey('company', $data);
        $this->assertArrayHasKey('contract', $data);
        $this->assertArrayHasKey('active_service', $data);
        $this->assertArrayHasKey('items', $data);
        $this->assertArrayHasKey('subtotal', $data);
        $this->assertArrayHasKey('discount_amount', $data);
        $this->assertArrayHasKey('tax_amount', $data);
        $this->assertArrayHasKey('total_amount', $data);
        $this->assertArrayHasKey('currency', $data);
        $this->assertArrayHasKey('creator', $data);
        $this->assertArrayHasKey('created_at', $data);
        $this->assertArrayHasKey('updated_at', $data);
    }

    public function test_resource_hides_payment_fields_without_payment_permission(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoiceOnlyViewer = User::factory()->create();
        $invoiceOnlyViewer->givePermissionTo('view_invoices');

        $data = $this->actingAs($invoiceOnlyViewer)
            ->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk()
            ->json('data');

        $this->assertArrayNotHasKey('paid_amount', $data);
        $this->assertArrayNotHasKey('balance_due', $data);
        $this->assertArrayNotHasKey('payments', $data);
    }

    public function test_resource_includes_payment_fields_for_payment_viewers(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(7),
            'due_date' => now()->addDays(7),
        ]);

        $invoice->payments()->create([
            'reference' => 'LM-PAY-2026-000001',
            'company_id' => $invoice->company_id,
            'status' => 'posted',
            'amount' => '250.00',
            'currency' => $invoice->currency,
            'method' => 'bank_transfer',
            'paid_at' => now()->subDay(),
            'recorded_by' => $this->admin->id,
        ]);

        $data = $this->actingAs($this->employee)
            ->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame('250.00', $data['paid_amount']);
        $this->assertSame('750.00', $data['balance_due']);
        $this->assertCount(1, $data['payments']);
    }

    // ===========================================================
    // AUDIT / ACTIVITY
    // ===========================================================

    public function test_audit_created_on_create(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.created',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_audit_created_on_update(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/invoices/{$invoice->id}", ['currency' => 'SAR', 'items' => $this->validItems()])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.updated',
            'subject_id' => $invoice->id,
        ]);
    }

    public function test_audit_created_on_issue(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/issue")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.issued',
            'subject_id' => $invoice->id,
        ]);
    }

    public function test_audit_created_on_cancel(): void
    {
        $invoice = $this->createDraftInvoice();
        $invoice->items()->create(['description' => 'Item', 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/cancel")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.cancelled',
            'subject_id' => $invoice->id,
        ]);
    }

    public function test_audit_created_on_overdue(): void
    {
        $invoice = $this->createDraftInvoice([
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(30),
            'due_date' => now()->subDay(),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/mark-overdue")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.overdue',
            'subject_id' => $invoice->id,
        ]);
    }

    public function test_audit_created_on_delete(): void
    {
        $invoice = $this->createDraftInvoice();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/invoices/{$invoice->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice.deleted',
            'subject_id' => $invoice->id,
        ]);
    }

    public function test_crm_activity_on_create(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $this->assertDatabaseHas('crm_activities', [
            'type' => 'invoice.created',
            'company_id' => $this->company->id,
        ]);
    }

    // ===========================================================
    // NO SIDE EFFECTS
    // ===========================================================

    public function test_no_contract_mutation_on_invoice_create(): void
    {
        $contract = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::DRAFT]);
        $originalStatus = $contract->status;

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $contract->refresh();
        $this->assertEquals($originalStatus, $contract->status);
    }

    public function test_no_active_service_mutation_on_invoice_create(): void
    {
        $contract = Contract::factory()->create(['company_id' => $this->company->id, 'status' => ContractStatus::ACTIVE]);
        $service = ActiveService::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => ActiveServiceStatus::ACTIVE,
        ]);
        $originalStatus = $service->status;

        $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'active_service_id' => $service->id,
                'currency' => 'AED',
                'items' => $this->validItems(),
            ])
            ->assertCreated();

        $service->refresh();
        $this->assertEquals($originalStatus, $service->status);
    }
}

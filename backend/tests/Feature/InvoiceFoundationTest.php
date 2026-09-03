<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\ActiveService;
use App\Models\Company;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InvoiceFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_invoice_model_persists_and_casts()
    {
        $creator = User::factory()->create();
        $company = Company::factory()->create();

        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'created_by' => $creator->id,
            'status' => InvoiceStatus::DRAFT,
            'currency' => 'AED',
            'subtotal' => 1000.50,
            'discount_amount' => 50.00,
            'tax_amount' => 47.52,
            'total_amount' => 998.02,
        ]);

        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'reference' => $invoice->reference,
            'currency' => 'AED',
            'subtotal' => 1000.50,
            'discount_amount' => 50.00,
            'tax_amount' => 47.52,
            'total_amount' => 998.02,
        ]);

        $this->assertTrue(str_starts_with($invoice->reference, 'LM-INV-'));
        $this->assertInstanceOf(InvoiceStatus::class, $invoice->status);
        $this->assertEquals(InvoiceStatus::DRAFT, $invoice->status);
        
        $this->assertIsString($invoice->subtotal);
        $this->assertEquals('1000.50', $invoice->subtotal);
    }

    public function test_invoice_relationships()
    {
        $company = Company::factory()->create();
        $contract = Contract::factory()->create();
        $activeService = ActiveService::factory()->create();
        $creator = User::factory()->create();

        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'active_service_id' => $activeService->id,
            'created_by' => $creator->id,
        ]);

        $this->assertEquals($company->id, $invoice->company->id);
        $this->assertEquals($contract->id, $invoice->contract->id);
        $this->assertEquals($activeService->id, $invoice->activeService->id);
        $this->assertEquals($creator->id, $invoice->creator->id);

        $this->assertTrue($company->invoices->contains($invoice));
        $this->assertTrue($contract->invoices->contains($invoice));
        $this->assertTrue($activeService->invoices->contains($invoice));
    }

    public function test_invoice_items_relationship_and_schema()
    {
        $invoice = Invoice::factory()->create();
        $item = InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 2.500,
            'unit_price' => 100.00,
            'line_total' => 250.00,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'id' => $item->id,
            'description' => 'Test Item',
        ]);

        $this->assertEquals('2.50', $item->quantity);
        $this->assertEquals('100.0000', $item->unit_price);
        $this->assertEquals('250.0000', $item->line_total);

        $this->assertTrue($invoice->items->contains($item));
        $this->assertEquals($invoice->id, $item->invoice->id);
    }

    public function test_invoice_soft_deletes()
    {
        $invoice = Invoice::factory()->create();
        $invoice->delete();

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
    }

    public function test_invoice_factory_states()
    {
        $draft = Invoice::factory()->create();
        $this->assertEquals(InvoiceStatus::DRAFT, $draft->status);

        $issued = Invoice::factory()->issued()->create();
        $this->assertEquals(InvoiceStatus::ISSUED, $issued->status);
        $this->assertNotNull($issued->issue_date);

        $partiallyPaid = Invoice::factory()->partiallyPaid()->create();
        $this->assertEquals(InvoiceStatus::PARTIALLY_PAID, $partiallyPaid->status);

        $paid = Invoice::factory()->paid()->create();
        $this->assertEquals(InvoiceStatus::PAID, $paid->status);

        $overdue = Invoice::factory()->overdue()->create();
        $this->assertEquals(InvoiceStatus::OVERDUE, $overdue->status);
        $this->assertNotNull($overdue->due_date);

        $cancelled = Invoice::factory()->cancelled()->create();
        $this->assertEquals(InvoiceStatus::CANCELLED, $cancelled->status);
    }

    public function test_domain_separation()
    {
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('invoices');
        $this->assertNotContains('payment_id', $columns);
        $this->assertNotContains('paid_amount', $columns);
        $this->assertNotContains('amount_paid', $columns);
        $this->assertNotContains('balance_due', $columns);
        $this->assertNotContains('renewal_id', $columns);
        $this->assertNotContains('approval_id', $columns);
        $this->assertNotContains('client_onboarding_id', $columns);
        $this->assertNotContains('quotation_id', $columns);

        $contractColumns = \Illuminate\Support\Facades\Schema::getColumnListing('contracts');
        $this->assertNotContains('invoice_id', $contractColumns);

        $serviceColumns = \Illuminate\Support\Facades\Schema::getColumnListing('active_services');
        $this->assertNotContains('invoice_id', $serviceColumns);
    }

    public function test_permissions_exist()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_invoices']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_invoices']);

        $employee = Role::where('name', 'employee')->first();
        $admin = Role::where('name', 'admin')->first();

        $this->assertTrue($employee->hasPermissionTo('view_invoices'));
        $this->assertFalse($employee->hasPermissionTo('manage_invoices'));

        $this->assertTrue($admin->hasPermissionTo('view_invoices'));
        $this->assertTrue($admin->hasPermissionTo('manage_invoices'));
    }

    public function test_policy()
    {
        $userWithView = User::factory()->create();
        $userWithView->assignRole('employee');

        $userWithManage = User::factory()->create();
        $userWithManage->assignRole('admin');

        $userWithout = User::factory()->create();

        $invoice = Invoice::factory()->create();

        $this->assertTrue($userWithView->can('view', $invoice));
        $this->assertFalse($userWithView->can('update', $invoice));
        
        $this->assertTrue($userWithManage->can('view', $invoice));
        $this->assertTrue($userWithManage->can('update', $invoice));
        $this->assertTrue($userWithManage->can('create', Invoice::class));
        $this->assertTrue($userWithManage->can('delete', $invoice));

        $this->assertFalse($userWithout->can('view', $invoice));
    }
}

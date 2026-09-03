<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Contract;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ContractStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ContractFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_contract_persists_with_correct_schema()
    {
        $contract = Contract::factory()->create([
            'reference' => 'LM-CTR-2026-000001',
            'title' => 'Master Services Agreement',
            'start_date' => null,
            'end_date' => null,
            'signed_at' => null,
            'contract_value' => null,
            'currency' => null,
            'terms' => null,
            'notes' => null,
        ]);

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'reference' => 'LM-CTR-2026-000001',
            'title' => 'Master Services Agreement',
            'status' => 'draft',
            'start_date' => null,
            'end_date' => null,
            'signed_at' => null,
            'contract_value' => null,
            'currency' => null,
        ]);

        $this->assertMatchesRegularExpression('/^LM-CTR-\d{4}-\d{6}$/', $contract->reference);
    }

    public function test_reference_is_unique()
    {
        Contract::factory()->create(['reference' => 'LM-CTR-2026-000001']);

        try {
            Contract::factory()->create(['reference' => 'LM-CTR-2026-000001']);
            $this->fail('Expected unique constraint violation was not thrown.');
        } catch (\Illuminate\Database\QueryException $e) {
            $this->assertTrue(
                str_contains(strtolower($e->getMessage()), 'unique constraint') ||
                str_contains(strtolower($e->getMessage()), 'duplicate entry'),
                'Expected unique constraint violation, got: ' . $e->getMessage()
            );
        }
    }

    public function test_relationships_work()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $quotation = Quotation::factory()->create(['company_id' => $company->id]);
        $creator = User::factory()->create();

        $contract = Contract::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'quotation_id' => $quotation->id,
            'created_by' => $creator->id,
        ]);

        $this->assertTrue($contract->company->is($company));
        $this->assertTrue($contract->contact->is($contact));
        $this->assertTrue($contract->quotation->is($quotation));
        $this->assertTrue($contract->creator->is($creator));
        
        $this->assertTrue($company->contracts->contains($contract));
        $this->assertTrue($contact->contracts->contains($contract));
        $this->assertTrue($quotation->contracts->contains($contract));
    }

    public function test_contract_statuses()
    {
        $draft = Contract::factory()->create();
        $this->assertEquals(ContractStatus::DRAFT, $draft->status);

        $active = Contract::factory()->active()->create();
        $this->assertEquals(ContractStatus::ACTIVE, $active->status);

        $expired = Contract::factory()->expired()->create();
        $this->assertEquals(ContractStatus::EXPIRED, $expired->status);

        $terminated = Contract::factory()->terminated()->create();
        $this->assertEquals(ContractStatus::TERMINATED, $terminated->status);

        $cancelled = Contract::factory()->cancelled()->create();
        $this->assertEquals(ContractStatus::CANCELLED, $cancelled->status);
    }

    public function test_finance_foundation()
    {
        $contract = Contract::factory()->create([
            'contract_value' => '150000.50',
            'currency' => 'SAR'
        ]);

        $this->assertIsString($contract->contract_value); // Due to decimal casting it might be string, depending on Laravel setup, but lets check value
        $this->assertEquals('150000.50', $contract->contract_value);
        $this->assertEquals('SAR', $contract->currency);
        
        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'contract_value' => '150000.50',
            'currency' => 'SAR'
        ]);
    }

    public function test_domain_separation()
    {
        $columns = Schema::getColumnListing('contracts');
        $this->assertNotContains('approval_status', $columns);
        $this->assertNotContains('approval_id', $columns);
        $this->assertNotContains('invoice_id', $columns);
        $this->assertNotContains('payment_id', $columns);
        $this->assertNotContains('onboarding_id', $columns);

        $quotationColumns = Schema::getColumnListing('quotations');
        $this->assertNotContains('contract_id', $quotationColumns);
    }
    
    public function test_permissions_exist()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_contracts']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_contracts']);
    }

    public function test_policy_maps_correctly()
    {
        $user = User::factory()->create();
        $contract = Contract::factory()->create();

        $this->assertFalse($user->can('view', $contract));
        $this->assertFalse($user->can('create', Contract::class));
        $this->assertFalse($user->can('update', $contract));
        $this->assertFalse($user->can('delete', $contract));

        $user->givePermissionTo('view_contracts');
        $this->assertTrue($user->fresh()->can('view', $contract));
        $this->assertFalse($user->fresh()->can('update', $contract));

        $user->givePermissionTo('manage_contracts');
        $this->assertTrue($user->fresh()->can('create', Contract::class));
        $this->assertTrue($user->fresh()->can('update', $contract));
        $this->assertTrue($user->fresh()->can('delete', $contract));
    }
    
    public function test_soft_delete()
    {
        $contract = Contract::factory()->create();
        $contract->delete();
        
        $this->assertSoftDeleted($contract);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\ActiveServiceStatus;
use App\Models\ActiveService;
use App\Models\ClientOnboarding;
use App\Models\Company;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ActiveServiceFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_schema_has_expected_columns()
    {
        $this->assertTrue(Schema::hasColumns('active_services', [
            'id',
            'service_catalog_id',
            'reference',
            'title',
            'description',
            'company_id',
            'contract_id',
            'client_onboarding_id',
            'status',
            'assigned_to',
            'start_date',
            'end_date',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        ]));
    }

    public function test_factory_can_create_draft_active_service()
    {
        $service = ActiveService::factory()->create();

        $this->assertDatabaseHas('active_services', [
            'id' => $service->id,
            'status' => ActiveServiceStatus::DRAFT->value,
            'reference' => $service->reference,
        ]);

        $this->assertStringStartsWith('LM-SVC-', $service->reference);
    }

    public function test_factory_states_produce_coherent_records()
    {
        $active = ActiveService::factory()->active()->create();
        $this->assertEquals(ActiveServiceStatus::ACTIVE, $active->status);

        $suspended = ActiveService::factory()->suspended()->create();
        $this->assertEquals(ActiveServiceStatus::SUSPENDED, $suspended->status);

        $ended = ActiveService::factory()->ended()->create();
        $this->assertEquals(ActiveServiceStatus::ENDED, $ended->status);
        $this->assertNotNull($ended->end_date);

        $cancelled = ActiveService::factory()->cancelled()->create();
        $this->assertEquals(ActiveServiceStatus::CANCELLED, $cancelled->status);
    }

    public function test_factory_with_onboarding_produces_coherent_relationships()
    {
        $service = ActiveService::factory()->withOnboarding()->create();

        $this->assertNotNull($service->client_onboarding_id);
        
        $onboarding = $service->clientOnboarding;
        $this->assertEquals($service->company_id, $onboarding->company_id);
        $this->assertEquals($service->contract_id, $onboarding->contract_id);
        // We assume the onboarding factory ->completed() state sets status to completed
        // which the prompt indicates. We just ensure it works.
    }

    public function test_relationships_exist_on_active_service()
    {
        $service = ActiveService::factory()->withOnboarding()->create();

        $this->assertInstanceOf(Company::class, $service->company);
        $this->assertInstanceOf(Contract::class, $service->contract);
        $this->assertInstanceOf(ClientOnboarding::class, $service->clientOnboarding);
        $this->assertInstanceOf(User::class, $service->creator);
    }

    public function test_reverse_relationships_exist()
    {
        $service = ActiveService::factory()->withOnboarding()->create();

        $company = $service->company;
        $this->assertTrue($company->activeServices->contains($service));

        $contract = $service->contract;
        $this->assertTrue($contract->activeServices->contains($service));

        $onboarding = $service->clientOnboarding;
        $this->assertTrue($onboarding->activeServices->contains($service));
    }

    public function test_active_service_can_be_soft_deleted()
    {
        $service = ActiveService::factory()->create();
        $service->delete();

        $this->assertSoftDeleted($service);
    }

    public function test_permissions_were_seeded()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_active_services']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_active_services']);
    }

    public function test_policy_enforces_permissions()
    {
        $userWithView = User::factory()->create();
        $userWithView->givePermissionTo('view_active_services');

        $userWithManage = User::factory()->create();
        $userWithManage->givePermissionTo('manage_active_services');

        $userWithoutPermissions = User::factory()->create();

        $policy = new \App\Policies\ActiveServicePolicy();
        $service = ActiveService::factory()->create();

        $this->assertTrue($policy->viewAny($userWithView));
        $this->assertFalse($policy->create($userWithView));

        $this->assertFalse($policy->viewAny($userWithoutPermissions));

        $this->assertTrue($policy->create($userWithManage));
        $this->assertTrue($policy->update($userWithManage, $service));
        $this->assertTrue($policy->delete($userWithManage, $service));
    }

    public function test_domain_separation()
    {
        $this->assertFalse(Schema::hasColumn('active_services', 'quotation_id'));
        $this->assertFalse(Schema::hasColumn('active_services', 'approval_id'));
        $this->assertFalse(Schema::hasColumn('active_services', 'invoice_id'));
        $this->assertFalse(Schema::hasColumn('active_services', 'task_id'));

        $this->assertFalse(Schema::hasColumn('contracts', 'active_service_id'));
        $this->assertFalse(Schema::hasColumn('client_onboardings', 'active_service_id'));
    }
}

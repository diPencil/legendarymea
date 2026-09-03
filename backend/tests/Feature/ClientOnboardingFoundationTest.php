<?php

namespace Tests\Feature;

use App\Enums\ClientOnboardingStatus;
use App\Models\ClientOnboarding;
use App\Models\Company;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ClientOnboardingFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_and_model_persists_correctly()
    {
        $onboarding = ClientOnboarding::factory()->create([
            'kickoff_date' => '2026-09-01',
            'target_go_live_date' => '2026-09-15',
            'requirements' => 'Needs active directory integration',
            'notes' => 'Internal note',
        ]);

        $this->assertDatabaseHas('client_onboardings', [
            'id' => $onboarding->id,
            'reference' => $onboarding->reference,
            'company_id' => $onboarding->company_id,
            'contract_id' => $onboarding->contract_id,
            'status' => ClientOnboardingStatus::DRAFT->value,
            'assigned_to' => null,
            'kickoff_date' => '2026-09-01',
            'target_go_live_date' => '2026-09-15',
            'completed_at' => null,
            'requirements' => 'Needs active directory integration',
            'notes' => 'Internal note',
            'created_by' => $onboarding->created_by,
        ]);

        $this->assertStringStartsWith('LM-ONB-', $onboarding->reference);
    }

    public function test_relationships()
    {
        $onboarding = ClientOnboarding::factory()->create();

        $this->assertInstanceOf(Company::class, $onboarding->company);
        $this->assertInstanceOf(Contract::class, $onboarding->contract);
        $this->assertNull($onboarding->assignee);
        $this->assertInstanceOf(User::class, $onboarding->creator);

        // Reverse relations
        $this->assertTrue($onboarding->company->clientOnboardings->contains($onboarding));
        $this->assertTrue($onboarding->contract->clientOnboardings->contains($onboarding));
    }

    public function test_statuses_and_factory_states()
    {
        $draft = ClientOnboarding::factory()->create();
        $this->assertEquals(ClientOnboardingStatus::DRAFT, $draft->status);
        $this->assertNull($draft->completed_at);

        $inProgress = ClientOnboarding::factory()->inProgress()->create();
        $this->assertEquals(ClientOnboardingStatus::IN_PROGRESS, $inProgress->status);
        $this->assertNull($inProgress->completed_at);
        $this->assertNotNull($inProgress->kickoff_date);
        $this->assertNotNull($inProgress->target_go_live_date);

        $completed = ClientOnboarding::factory()->completed()->create();
        $this->assertEquals(ClientOnboardingStatus::COMPLETED, $completed->status);
        $this->assertNotNull($completed->completed_at);

        $cancelled = ClientOnboarding::factory()->cancelled()->create();
        $this->assertEquals(ClientOnboardingStatus::CANCELLED, $cancelled->status);
        $this->assertNull($cancelled->completed_at);
    }

    public function test_domain_separation()
    {
        $columns = Schema::getColumnListing('client_onboardings');
        
        $this->assertNotContains('quotation_id', $columns);
        $this->assertNotContains('approval_id', $columns);
        $this->assertNotContains('active_service_id', $columns);
        $this->assertNotContains('invoice_id', $columns);
        $this->assertNotContains('payment_id', $columns);
        $this->assertNotContains('task_id', $columns);

        $contractColumns = Schema::getColumnListing('contracts');
        $this->assertNotContains('client_onboarding_id', $contractColumns);
    }

    public function test_permissions_exist()
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->assertDatabaseHas('permissions', ['name' => 'view_client_onboardings']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_client_onboardings']);
    }

    public function test_policy_mapping()
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        
        $onboarding = ClientOnboarding::factory()->create();
        $policy = new \App\Policies\ClientOnboardingPolicy();

        $this->assertFalse($policy->viewAny($user));
        $this->assertFalse($policy->view($user, $onboarding));
        $this->assertFalse($policy->create($user));
        $this->assertFalse($policy->update($user, $onboarding));
        $this->assertFalse($policy->delete($user, $onboarding));

        $user->givePermissionTo('view_client_onboardings');
        $this->assertTrue($policy->viewAny($user));
        $this->assertTrue($policy->view($user, $onboarding));
        $this->assertFalse($policy->create($user));

        $user->givePermissionTo('manage_client_onboardings');
        $this->assertTrue($policy->create($user));
        $this->assertTrue($policy->update($user, $onboarding));
        $this->assertTrue($policy->delete($user, $onboarding));
    }
}

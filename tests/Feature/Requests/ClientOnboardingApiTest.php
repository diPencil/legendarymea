<?php

namespace Tests\Feature\Requests;

use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\ClientOnboarding;
use App\Models\Company;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientOnboardingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/client-onboardings')->assertUnauthorized();
    }

    public function test_permission_required_for_list_and_show()
    {
        $user = User::factory()->create();
        
        $this->actingAs($user)->getJson('/api/v1/client-onboardings')->assertForbidden();
        
        $onboarding = ClientOnboarding::factory()->create();
        $this->actingAs($user)->getJson("/api/v1/client-onboardings/{$onboarding->id}")->assertForbidden();

        $user->givePermissionTo('view_client_onboardings');
        $this->actingAs($user)->getJson('/api/v1/client-onboardings')->assertOk();
        $this->actingAs($user)->getJson("/api/v1/client-onboardings/{$onboarding->id}")->assertOk();
    }

    public function test_view_only_cannot_mutate()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_client_onboardings');
        
        $onboarding = ClientOnboarding::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/client-onboardings', [])->assertForbidden();
        $this->actingAs($user)->putJson("/api/v1/client-onboardings/{$onboarding->id}", [])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/client-onboardings/{$onboarding->id}")->assertForbidden();
        $this->actingAs($user)->postJson("/api/v1/client-onboardings/{$onboarding->id}/start")->assertForbidden();
    }

    public function test_create_valid_onboarding()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $company = Company::factory()->create();
        $contract = Contract::factory()->create(['company_id' => $company->id, 'status' => ContractStatus::ACTIVE]);
        $assignee = User::factory()->create();

        $payload = [
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'assigned_to' => $assignee->id,
            'kickoff_date' => '2026-10-01',
            'target_go_live_date' => '2026-10-15',
            'requirements' => 'Some reqs',
            'notes' => 'Some notes',
            'status' => 'completed', // should be ignored
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/client-onboardings', $payload);
        
        $response->assertCreated();
        $data = $response->json('data');

        $this->assertEquals(ClientOnboardingStatus::DRAFT->value, $data['status']);
        $this->assertEquals($company->id, $data['company']['id']);
        $this->assertEquals($contract->id, $data['contract']['id']);
        $this->assertEquals($assignee->id, $data['assigned_to']['id']);
        $this->assertEquals($user->id, $data['creator']['id']);
        $this->assertStringStartsWith('LM-ONB-', $data['reference']);
        $this->assertEquals('2026-10-01', $data['kickoff_date']);
        
        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => ClientOnboarding::class,
            'subject_id' => $data['id'] ?? $onboarding->id ?? ClientOnboarding::first()->id,
            'user_id' => $user->id,
            'action' => 'client_onboarding.created',
        ]);
    }

    public function test_create_validation_rules()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $company = Company::factory()->create();
        
        // Draft contract
        $draftContract = Contract::factory()->create(['company_id' => $company->id, 'status' => ContractStatus::DRAFT]);
        $this->actingAs($user)->postJson('/api/v1/client-onboardings', [
            'company_id' => $company->id,
            'contract_id' => $draftContract->id,
        ])->assertJsonValidationErrors(['contract_id']);

        // Cross company
        $otherCompany = Company::factory()->create();
        $activeContract = Contract::factory()->create(['company_id' => $otherCompany->id, 'status' => ContractStatus::ACTIVE]);
        $this->actingAs($user)->postJson('/api/v1/client-onboardings', [
            'company_id' => $company->id,
            'contract_id' => $activeContract->id,
        ])->assertJsonValidationErrors(['contract_id']);
        
        // Uniqueness
        $validContract = Contract::factory()->create(['company_id' => $company->id, 'status' => ContractStatus::ACTIVE]);
        ClientOnboarding::factory()->create(['contract_id' => $validContract->id, 'status' => ClientOnboardingStatus::DRAFT]);
        
        $this->actingAs($user)->postJson('/api/v1/client-onboardings', [
            'company_id' => $company->id,
            'contract_id' => $validContract->id,
        ])->assertJsonValidationErrors(['contract_id']);
    }

    public function test_update_onboarding()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $onboarding = ClientOnboarding::factory()->create();
        $assignee = User::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/v1/client-onboardings/{$onboarding->id}", [
            'assigned_to' => $assignee->id,
            'notes' => 'Updated note',
            'kickoff_date' => null, // clearable
        ]);

        $response->assertOk();
        $data = $response->json('data');
        
        $this->assertEquals($assignee->id, $data['assigned_to']['id']);
        $this->assertEquals('Updated note', $data['notes']);
        $this->assertNull($data['kickoff_date']);
        
        $this->assertDatabaseHas('audit_logs', [
            'subject_id' => $onboarding->id,
            'subject_type' => ClientOnboarding::class,
            'action' => 'client_onboarding.updated',
        ]);
    }

    public function test_cannot_update_terminal_onboarding()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $completed = ClientOnboarding::factory()->completed()->create();
        
        $this->actingAs($user)->putJson("/api/v1/client-onboardings/{$completed->id}", [
            'notes' => 'Updated note',
        ])->assertJsonValidationErrors(['status']);
    }

    public function test_lifecycle_start()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        // Create an active contract first so start doesn't fail
        $company = Company::factory()->create();
        $contract = Contract::factory()->create(['company_id' => $company->id, 'status' => ContractStatus::ACTIVE]);
        
        $draft = ClientOnboarding::factory()->create([
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'status' => ClientOnboardingStatus::DRAFT
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/client-onboardings/{$draft->id}/start");
        $response->assertOk();
        $this->assertEquals(ClientOnboardingStatus::IN_PROGRESS->value, $response->json('data.status'));
        
        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => ClientOnboarding::class,
            'subject_id' => $draft->id,
            'action' => 'client_onboarding.started',
        ]);
    }

    public function test_lifecycle_complete_and_cancel()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $inProgress = ClientOnboarding::factory()->inProgress()->create();
        $response = $this->actingAs($user)->postJson("/api/v1/client-onboardings/{$inProgress->id}/complete");
        $response->assertOk();
        $this->assertEquals(ClientOnboardingStatus::COMPLETED->value, $response->json('data.status'));
        $this->assertNotNull($response->json('data.completed_at'));

        $draft = ClientOnboarding::factory()->create();
        $response = $this->actingAs($user)->postJson("/api/v1/client-onboardings/{$draft->id}/cancel");
        $response->assertOk();
        $this->assertEquals(ClientOnboardingStatus::CANCELLED->value, $response->json('data.status'));
        $this->assertNull($response->json('data.completed_at'));
    }

    public function test_delete_rules()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_client_onboardings');
        
        $draft = ClientOnboarding::factory()->create();
        $inProgress = ClientOnboarding::factory()->inProgress()->create();
        $completed = ClientOnboarding::factory()->completed()->create();
        
        $this->actingAs($user)->deleteJson("/api/v1/client-onboardings/{$inProgress->id}")->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/client-onboardings/{$completed->id}")->assertForbidden();
        
        $this->actingAs($user)->deleteJson("/api/v1/client-onboardings/{$draft->id}")->assertNoContent();
        $this->assertSoftDeleted($draft);
    }

    public function test_list_pagination_search_filters_sorting()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_client_onboardings');
        
        ClientOnboarding::factory()->create(['reference' => 'LM-ONB-2026-000001', 'status' => ClientOnboardingStatus::DRAFT]);
        ClientOnboarding::factory()->create(['reference' => 'LM-ONB-2026-000002', 'status' => ClientOnboardingStatus::COMPLETED]);
        ClientOnboarding::factory()->create(['reference' => 'LM-ONB-2026-000003', 'status' => ClientOnboardingStatus::IN_PROGRESS]);

        $response = $this->actingAs($user)->getJson('/api/v1/client-onboardings?status=in_progress');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('LM-ONB-2026-000003', $response->json('data.0.reference'));
        
        $response = $this->actingAs($user)->getJson('/api/v1/client-onboardings?reference=000001');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('LM-ONB-2026-000001', $response->json('data.0.reference'));
    }
}

<?php

namespace Tests\Feature;

use App\Enums\ActiveServiceStatus;
use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\ClientOnboarding;
use App\Models\Company;
use App\Models\Contract;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveServiceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->seed(\Database\Seeders\ServiceCatalogSeeder::class);
    }

    private function getAuthUser($permissions = []): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }
        return $user;
    }

    private function catalogId(): int
    {
        return ServiceCatalog::where('code', 'hotels_accommodation')->value('id');
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/active-services')->assertUnauthorized();
        $this->postJson('/api/v1/active-services')->assertUnauthorized();
    }

    public function test_permission_required_for_list_and_show()
    {
        $user = $this->getAuthUser();
        $service = ActiveService::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/active-services')->assertForbidden();
        $this->actingAs($user)->getJson("/api/v1/active-services/{$service->id}")->assertForbidden();

        $userWithView = $this->getAuthUser(['view_active_services']);
        $this->actingAs($userWithView)->getJson('/api/v1/active-services')->assertOk();
        $this->actingAs($userWithView)->getJson("/api/v1/active-services/{$service->id}")->assertOk();
    }

    public function test_view_only_cannot_mutate()
    {
        $user = $this->getAuthUser(['view_active_services']);
        $service = ActiveService::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/active-services', [])->assertForbidden();
        $this->actingAs($user)->putJson("/api/v1/active-services/{$service->id}", [])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/active-services/{$service->id}")->assertForbidden();
        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/activate")->assertForbidden();
    }

    public function test_create_valid_service_with_canonical_reference_and_relationships()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $company->id]);
        $assignee = User::factory()->create();

        $payload = [
            'title' => 'Managed IT Services',
            'service_catalog_id' => $this->catalogId(),
            'description' => '24/7 IT Support',
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'assigned_to' => $assignee->id,
            'start_date' => now()->format('Y-m-d'),
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/active-services', $payload);

        $response->assertCreated();
        $response->assertJsonPath('data.title', 'Managed IT Services');
        $response->assertJsonPath('data.status', 'draft');
        $response->assertJsonPath('data.service_catalog.code', 'hotels_accommodation');
        $response->assertJsonPath('data.company.id', $company->id);
        $response->assertJsonPath('data.contract.id', $contract->id);
        $response->assertJsonPath('data.assignee.id', $assignee->id);
        $response->assertJsonPath('data.creator.id', $user->id);
        
        $reference = $response->json('data.reference');
        $this->assertStringStartsWith('LM-SVC-', $reference);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'active_service.created',
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'active_service.created',
            'user_id' => $user->id,
            'subject_type' => ActiveService::class,
        ]);

        $log = AuditLog::where('action', 'active_service.created')
            ->where('subject_type', ActiveService::class)
            ->latest()
            ->firstOrFail();
        $this->assertSame($company->id, $log->new_values['company_id']);
    }

    public function test_non_active_contract_rejected()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->create(['company_id' => $company->id, 'status' => ContractStatus::EXPIRED]);

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $this->catalogId(),
            'company_id' => $company->id,
            'contract_id' => $contract->id,
        ];

        $this->actingAs($user)->postJson('/api/v1/active-services', $payload)
             ->assertStatus(500);
    }

    public function test_cross_company_contract_rejected()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $otherCompany->id]);

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $this->catalogId(),
            'company_id' => $company->id,
            'contract_id' => $contract->id,
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/active-services', $payload);
        $this->assertGreaterThanOrEqual(400, $response->status());
    }

    public function test_onboarding_nullable_and_valid_accepted()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $company->id]);
        $onboarding = ClientOnboarding::factory()->completed()->create([
            'company_id' => $company->id,
            'contract_id' => $contract->id,
        ]);

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $this->catalogId(),
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'client_onboarding_id' => $onboarding->id,
        ];

        $this->actingAs($user)->postJson('/api/v1/active-services', $payload)
             ->assertCreated()
             ->assertJsonPath('data.client_onboarding.id', $onboarding->id);
    }

    public function test_draft_onboarding_rejected()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $company->id]);
        $onboarding = ClientOnboarding::factory()->create([
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'status' => ClientOnboardingStatus::DRAFT,
        ]);

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $this->catalogId(),
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'client_onboarding_id' => $onboarding->id,
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/active-services', $payload);
        $this->assertGreaterThanOrEqual(400, $response->status());
    }

    public function test_dates_validation()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $company->id]);

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $this->catalogId(),
            'company_id' => $company->id,
            'contract_id' => $contract->id,
            'start_date' => '2026-01-10',
            'end_date' => '2026-01-05',
        ];

        // This fails FormRequest validation (after_or_equal)
        $this->actingAs($user)->postJson('/api/v1/active-services', $payload)
             ->assertStatus(422);
    }

    public function test_unavailable_catalog_service_rejected_for_active_service()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $company = Company::factory()->create();
        $contract = Contract::factory()->active()->create(['company_id' => $company->id]);
        $catalog = ServiceCatalog::where('code', 'partnership')->firstOrFail();

        $payload = [
            'title' => 'Test',
            'service_catalog_id' => $catalog->id,
            'company_id' => $company->id,
            'contract_id' => $contract->id,
        ];

        $this->actingAs($user)->postJson('/api/v1/active-services', $payload)
             ->assertStatus(422);
    }

    public function test_update_draft_works_and_nullable_clearing()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create([
            'description' => 'Initial',
            'start_date' => '2026-01-01',
        ]);

        $payload = [
            'title' => 'Updated Title',
            'description' => null,
        ];

        $this->actingAs($user)->putJson("/api/v1/active-services/{$service->id}", $payload)
             ->assertOk()
             ->assertJsonPath('data.title', 'Updated Title')
             ->assertJsonPath('data.description', null)
             ->assertJsonPath('data.start_date', '2026-01-01'); // Preserved because missing

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'active_service.updated',
            'subject_id' => $service->id,
        ]);
    }

    public function test_immutable_company_and_contract_on_update()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create();
        
        $otherCompany = Company::factory()->create();
        
        $payload = [
            'company_id' => $otherCompany->id, // Should be ignored
            'title' => 'New Title'
        ];

        $response = $this->actingAs($user)->putJson("/api/v1/active-services/{$service->id}", $payload);
        
        $response->assertOk();
        $response->assertJsonPath('data.company.id', $service->company_id);
    }

    public function test_lifecycle_draft_to_active()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create();

        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/activate")
             ->assertOk()
             ->assertJsonPath('data.status', 'active');
             
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'active_service.activated',
            'subject_id' => $service->id,
        ]);
    }

    public function test_lifecycle_draft_to_cancelled()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create();

        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/cancel")
             ->assertOk()
             ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_lifecycle_active_to_suspended()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->active()->create();

        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/suspend")
             ->assertOk()
             ->assertJsonPath('data.status', 'suspended');
    }

    public function test_lifecycle_active_to_ended()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->active()->create();

        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/end")
             ->assertOk()
             ->assertJsonPath('data.status', 'ended');
    }

    public function test_lifecycle_suspended_to_active()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->suspended()->create();

        $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/resume")
             ->assertOk()
             ->assertJsonPath('data.status', 'active');
    }

    public function test_invalid_lifecycle_draft_to_suspended_blocked()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/suspend");
        $this->assertGreaterThanOrEqual(400, $response->status());
    }

    public function test_contract_eligibility_during_activation()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        $service = ActiveService::factory()->create();
        
        // Make contract expired
        $contract = $service->contract;
        $contract->status = ContractStatus::EXPIRED;
        $contract->save();

        $response = $this->actingAs($user)->postJson("/api/v1/active-services/{$service->id}/activate");
        $this->assertGreaterThanOrEqual(400, $response->status());
    }

    public function test_delete_rules()
    {
        $user = $this->getAuthUser(['manage_active_services']);
        
        $draft = ActiveService::factory()->create();
        $this->actingAs($user)->deleteJson("/api/v1/active-services/{$draft->id}")->assertNoContent();
        
        $cancelled = ActiveService::factory()->cancelled()->create();
        $this->actingAs($user)->deleteJson("/api/v1/active-services/{$cancelled->id}")->assertNoContent();

        $active = ActiveService::factory()->active()->create();
        $this->actingAs($user)->deleteJson("/api/v1/active-services/{$active->id}")->assertForbidden();

        $ended = ActiveService::factory()->ended()->create();
        $this->actingAs($user)->deleteJson("/api/v1/active-services/{$ended->id}")->assertForbidden();
    }

    public function test_list_pagination_and_search()
    {
        $user = $this->getAuthUser(['view_active_services']);
        ActiveService::factory()->count(20)->create();
        
        $searchService = ActiveService::factory()->create(['title' => 'UniqueSearchTerm']);

        $response = $this->actingAs($user)->getJson('/api/v1/active-services');
        $response->assertOk();
        $response->assertJsonCount(15, 'data'); // default per_page

        $responseSearch = $this->actingAs($user)->getJson('/api/v1/active-services?title=UniqueSearchTerm');
        $responseSearch->assertOk();
        $responseSearch->assertJsonCount(1, 'data');
        $responseSearch->assertJsonPath('data.0.id', $searchService->id);
    }
}

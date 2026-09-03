<?php

namespace Tests\Feature;

use App\Enums\ContractStatus;
use App\Enums\RenewalStatus;
use App\Models\ActiveService;
use App\Models\Company;
use App\Models\Contract;
use App\Models\Renewal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RenewalApiTest extends TestCase
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

    private function makeContract(array $overrides = []): Contract
    {
        return Contract::factory()->create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'status' => ContractStatus::ACTIVE,
        ], $overrides));
    }

    public function test_requires_auth_and_permissions(): void
    {
        $this->getJson('/api/v1/renewals')->assertUnauthorized();
        $this->actingAs($this->noAccess)->getJson('/api/v1/renewals')->assertForbidden();
        $this->actingAs($this->employee)->getJson('/api/v1/renewals')->assertOk();
    }

    public function test_view_only_cannot_create_or_mutate(): void
    {
        $contract = $this->makeContract();
        $renewal = Renewal::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
        ]);

        $this->actingAs($this->employee)
            ->postJson('/api/v1/renewals', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'renewal_due_date' => now()->addMonth()->format('Y-m-d'),
            ])
            ->assertForbidden();

        $this->actingAs($this->employee)
            ->postJson("/api/v1/renewals/{$renewal->id}/mark-due")
            ->assertForbidden();
    }

    public function test_creates_renewal_with_reference_and_relationship_validation(): void
    {
        $contract = $this->makeContract();
        $activeService = ActiveService::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/renewals', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'active_service_id' => $activeService->id,
                'renewal_due_date' => now()->addMonth()->format('Y-m-d'),
                'renewal_amount' => '1500.00',
                'currency' => 'AED',
                'assigned_to' => $this->admin->id,
            ])
            ->assertCreated();

        $response->assertJsonPath('data.company.id', $this->company->id);
        $this->assertMatchesRegularExpression('/^LM-RNW-\d{4}-\d{6}$/', $response->json('data.reference'));
        $this->assertDatabaseHas('renewals', [
            'contract_id' => $contract->id,
            'active_service_id' => $activeService->id,
            'currency' => 'AED',
        ]);
    }

    public function test_rejects_invalid_source_contract_and_one_open_rule(): void
    {
        $draft = $this->makeContract(['status' => ContractStatus::DRAFT]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/renewals', [
                'company_id' => $this->company->id,
                'contract_id' => $draft->id,
                'renewal_due_date' => now()->addMonth()->format('Y-m-d'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['contract_id']);

        $contract = $this->makeContract();
        Renewal::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => RenewalStatus::UPCOMING,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/renewals', [
                'company_id' => $this->company->id,
                'contract_id' => $contract->id,
                'renewal_due_date' => now()->addMonths(2)->format('Y-m-d'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['contract_id']);
    }

    public function test_lifecycle_transitions_require_valid_successor_contract(): void
    {
        $contract = $this->makeContract();
        $renewal = Renewal::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => RenewalStatus::UPCOMING,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
        ]);
        $successor = $this->makeContract(['status' => ContractStatus::ACTIVE]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/renewals/{$renewal->id}/mark-due")
            ->assertOk()
            ->assertJsonPath('data.status', RenewalStatus::DUE->value);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/renewals/{$renewal->id}/complete", [
                'renewed_contract_id' => $contract->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['renewed_contract_id']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/renewals/{$renewal->id}/complete", [
                'renewed_contract_id' => $successor->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', RenewalStatus::COMPLETED->value);
    }

    public function test_decline_cancel_and_delete_rules_are_enforced(): void
    {
        $contract = $this->makeContract();
        $renewal = Renewal::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => RenewalStatus::UPCOMING,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/renewals/{$renewal->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', RenewalStatus::CANCELLED->value);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/renewals/{$renewal->id}")
            ->assertNoContent();

        $completed = Renewal::factory()->create([
            'company_id' => $this->company->id,
            'contract_id' => $contract->id,
            'status' => RenewalStatus::COMPLETED,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/renewals/{$completed->id}")
            ->assertStatus(422);
    }

    public function test_search_filter_and_sort_work(): void
    {
        $contractA = $this->makeContract(['reference' => 'LM-CTR-2026-000001']);
        $contractB = $this->makeContract(['reference' => 'LM-CTR-2026-000002']);

        Renewal::factory()->create([
            'reference' => 'LM-RNW-2026-000010',
            'company_id' => $this->company->id,
            'contract_id' => $contractA->id,
            'status' => RenewalStatus::UPCOMING,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
            'renewal_amount' => '500.00',
        ]);

        Renewal::factory()->create([
            'reference' => 'LM-RNW-2026-000011',
            'company_id' => $this->company->id,
            'contract_id' => $contractB->id,
            'status' => RenewalStatus::DUE,
            'created_by' => $this->admin->id,
            'assigned_to' => $this->admin->id,
            'renewal_amount' => '900.00',
        ]);

        $this->actingAs($this->employee)
            ->getJson('/api/v1/renewals?search=000011&status=due&sort_by=renewal_amount&sort_order=desc')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reference', 'LM-RNW-2026-000011');
    }
}

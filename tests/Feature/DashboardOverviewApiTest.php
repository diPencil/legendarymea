<?php

namespace Tests\Feature;

use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardOverviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_dashboard_overview_returns_aggregated_counts_in_one_response(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        Employee::factory()->count(2)->create();
        $company = Company::factory()->create();
        Contact::factory()->create(['company_id' => $company->id]);
        Lead::factory()->create(['status' => LeadStatus::NEW]);
        Lead::factory()->create(['status' => LeadStatus::QUALIFIED]);
        Opportunity::factory()->create(['stage' => OpportunityStage::PROPOSAL]);

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/dashboard/overview')
            ->assertOk();

        $totals = collect($response->json('data.totals'));

        $this->assertSame(Employee::query()->count(), $totals->firstWhere('key', 'employees')['total']);
        $this->assertSame(Company::query()->count(), $totals->firstWhere('key', 'companies')['total']);
        $this->assertSame(Contact::query()->count(), $totals->firstWhere('key', 'contacts')['total']);
        $this->assertSame(1, collect($response->json('data.lead_snapshot'))->firstWhere('key', LeadStatus::NEW->value)['total']);
        $this->assertSame(1, collect($response->json('data.lead_snapshot'))->firstWhere('key', LeadStatus::QUALIFIED->value)['total']);
        $this->assertSame(1, collect($response->json('data.pipeline_snapshot'))->firstWhere('key', OpportunityStage::PROPOSAL->value)['total']);
    }

    public function test_dashboard_overview_denies_metric_counts_without_permission(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/v1/dashboard/overview')
            ->assertOk();

        $companies = collect($response->json('data.totals'))->firstWhere('key', 'companies');

        $this->assertSame('denied', $companies['status']);
        $this->assertNull($companies['total']);
        $this->assertSame([], $response->json('data.lead_snapshot'));
        $this->assertSame([], $response->json('data.pipeline_snapshot'));
    }
}

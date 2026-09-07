<?php

namespace Tests\Feature;

use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request as ClientRequest;
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
        Lead::factory()->create(['status' => LeadStatus::NEW, 'created_at' => now()->subDay()]);
        Lead::factory()->create(['status' => LeadStatus::QUALIFIED]);
        Opportunity::factory()->create(['stage' => OpportunityStage::PROPOSAL]);
        ClientRequest::factory()->create(['company_id' => $company->id]);
        AuditLog::query()->create([
            'user_id' => $admin->id,
            'action' => 'company.created',
            'subject_type' => Company::class,
            'subject_id' => $company->id,
            'request_context' => [
                'actor_name' => $admin->name,
                'module' => 'Company',
                'title_en' => 'Company created',
                'title_ar' => 'تم إنشاء شركة',
                'description_en' => $company->name,
                'description_ar' => $company->name,
            ],
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/dashboard/overview?period=today')
            ->assertOk();

        $totals = collect($response->json('data.totals'));

        $this->assertSame(Employee::query()->count(), $totals->firstWhere('key', 'employees')['total']);
        $this->assertSame(Company::query()->count(), $totals->firstWhere('key', 'companies')['total']);
        $this->assertSame(Contact::query()->count(), $totals->firstWhere('key', 'contacts')['total']);
        $this->assertSame(2, collect($response->json('data.lead_snapshot'))->firstWhere('key', LeadStatus::NEW->value)['total']);
        $this->assertSame(1, collect($response->json('data.lead_snapshot'))->firstWhere('key', LeadStatus::QUALIFIED->value)['total']);
        $this->assertSame(1, collect($response->json('data.pipeline_snapshot'))->firstWhere('key', OpportunityStage::PROPOSAL->value)['total']);
        $this->assertSame('today', $response->json('data.period'));
        $this->assertSame(2, collect($response->json('data.activity_report'))->firstWhere('key', 'new_leads')['total']);
        $this->assertSame(1, collect($response->json('data.activity_report'))->firstWhere('key', 'new_requests')['total']);
        $this->assertSame('Company created', $response->json('data.recent_activity.0.title.en'));
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
        $this->assertSame('denied', collect($response->json('data.activity_report'))->firstWhere('key', 'new_companies')['status']);
    }
}

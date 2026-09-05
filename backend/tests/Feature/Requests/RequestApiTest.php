<?php

namespace Tests\Feature\Requests;

use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use App\Enums\ServiceInterest;

use App\Models\Company;
use App\Models\Contact;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Opportunity;
use App\Models\Request as BusinessRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected User $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->seed(\Database\Seeders\ServiceCatalogSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        Employee::factory()->create(['user_id' => $this->admin->id]);

        $this->employeeUser = User::factory()->create();
        $this->employeeUser->assignRole('employee');
        $this->employee = Employee::factory()->create(['user_id' => $this->employeeUser->id]);

        $this->client = User::factory()->create();
        $this->client->assignRole('client');
    }

    public function test_auth_required(): void
    {
        $this->getJson('/api/v1/requests')->assertStatus(401);
    }

    public function test_permission_required_for_list_and_show(): void
    {
        $request = BusinessRequest::factory()->create();

        $this->actingAs($this->client);

        $this->getJson('/api/v1/requests')->assertStatus(403);
        $this->getJson("/api/v1/requests/{$request->id}")->assertStatus(403);
    }

    public function test_list_supports_pagination_search_filters_and_sorting(): void
    {
        $company = Company::factory()->create(['name' => 'Acme Travel']);
        $otherCompany = Company::factory()->create();
        $assignee = Employee::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);

        BusinessRequest::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'assigned_to' => $assignee->id,
            'title' => 'VIP hotel request',
            'status' => RequestStatus::ASSIGNED->value,
            'priority' => RequestPriority::HIGH->value,
            'service_interest' => ServiceInterest::HOTELS_ACCOMMODATION->value,
            'due_at' => Carbon::parse('2026-09-10'),
            'created_at' => Carbon::parse('2026-08-20'),
        ]);
        BusinessRequest::factory()->create([
            'company_id' => $otherCompany->id,
            'title' => 'Airport transfer request',
            'status' => RequestStatus::NEW->value,
            'priority' => RequestPriority::NORMAL->value,
            'service_interest' => ServiceInterest::TRANSFERS->value,
            'created_at' => Carbon::parse('2026-10-01'),
        ]);

        $this->actingAs($this->admin);

        $this->getJson('/api/v1/requests?per_page=1')
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);

        $this->assertCount(1, $this->getJson('/api/v1/requests?search=Acme')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/requests?status=assigned')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/requests?priority=high')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/requests?service_interest=hotels_accommodation')->json('data'));
        $this->assertCount(1, $this->getJson("/api/v1/requests?company_id={$company->id}")->json('data'));
        $this->assertCount(1, $this->getJson("/api/v1/requests?contact_id={$contact->id}")->json('data'));
        $this->assertCount(1, $this->getJson("/api/v1/requests?opportunity_id={$opportunity->id}")->json('data'));
        $this->assertCount(1, $this->getJson("/api/v1/requests?assigned_to={$assignee->id}")->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/requests?due_from=2026-09-01&due_to=2026-09-30')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/requests?created_from=2026-08-01&created_to=2026-08-31')->json('data'));

        $response = $this->getJson('/api/v1/requests?sort_by=title&sort_dir=asc');
        $this->assertEquals('Airport transfer request', $response->json('data.0.title'));
    }

    public function test_employee_list_scope_includes_assigned_and_created_requests(): void
    {
        BusinessRequest::factory()->create(['assigned_to' => $this->employee->id]);
        BusinessRequest::factory()->create(['created_by' => $this->employeeUser->id]);
        BusinessRequest::factory()->create();

        $this->actingAs($this->employeeUser);

        $response = $this->getJson('/api/v1/requests');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_create_valid_request_with_canonical_reference_and_relationships(): void
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);
        $assignee = Employee::factory()->create();

        $this->actingAs($this->admin);

        $response = $this->postJson('/api/v1/requests', [
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'assigned_to' => $assignee->id,
            'title' => 'Arrange executive stay',
            'description' => 'Need hotel options for visiting board members.',
            'service_interest' => ServiceInterest::HOTELS_ACCOMMODATION->value,
            'priority' => RequestPriority::HIGH->value,
            'due_at' => '2026-09-15 10:00:00',
            'reference' => 'BAD-REF',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['reference']);

        $response = $this->postJson('/api/v1/requests', [
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'assigned_to' => $assignee->id,
            'title' => 'Arrange executive stay',
            'description' => 'Need hotel options for visiting board members.',
            'service_interest' => ServiceInterest::HOTELS_ACCOMMODATION->value,
            'priority' => RequestPriority::HIGH->value,
            'due_at' => '2026-09-15 10:00:00',
        ]);

        $response->assertStatus(201);
        $this->assertStringStartsWith('LM-REQ-' . date('Y') . '-', $response->json('data.reference'));
        $response->assertJsonPath('data.company.id', $company->id);
        $response->assertJsonPath('data.contact.id', $contact->id);
        $response->assertJsonPath('data.opportunity.id', $opportunity->id);
        $response->assertJsonPath('data.assigned_to', $assignee->id);
        $this->assertDatabaseHas('requests', [
            'id' => $response->json('data.id'),
            'created_by' => $this->admin->id,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.created']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.created']);
    }

    public function test_company_and_title_are_required(): void
    {
        $this->actingAs($this->admin);

        $this->postJson('/api/v1/requests', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['company_id', 'title']);
    }

    public function test_contact_and_opportunity_company_mismatches_are_rejected(): void
    {
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();
        $otherContact = Contact::factory()->create(['company_id' => $otherCompany->id]);
        $otherOpportunity = Opportunity::factory()->create(['company_id' => $otherCompany->id]);

        $this->actingAs($this->admin);

        $this->postJson('/api/v1/requests', [
            'company_id' => $company->id,
            'contact_id' => $otherContact->id,
            'title' => 'Bad contact request',
        ])->assertStatus(422)->assertJsonValidationErrors(['contact_id']);

        $this->postJson('/api/v1/requests', [
            'company_id' => $company->id,
            'opportunity_id' => $otherOpportunity->id,
            'title' => 'Bad opportunity request',
        ])->assertStatus(422)->assertJsonValidationErrors(['opportunity_id']);
    }

    public function test_show_returns_request_resource(): void
    {
        $company = Company::factory()->create();
        $request = BusinessRequest::factory()->create(['company_id' => $company->id]);

        $this->actingAs($this->admin);

        $this->getJson("/api/v1/requests/{$request->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $request->id)
            ->assertJsonPath('data.company.id', $company->id);
    }

    public function test_update_editable_fields_and_relationship_validation(): void
    {
        $company = Company::factory()->create();
        $newCompany = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $newCompany->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $newCompany->id]);
        $wrongContact = Contact::factory()->create(['company_id' => $company->id]);
        $request = BusinessRequest::factory()->create(['company_id' => $company->id]);

        $this->actingAs($this->admin);

        $this->patchJson("/api/v1/requests/{$request->id}", [
            'company_id' => $newCompany->id,
            'contact_id' => $wrongContact->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['contact_id']);

        $response = $this->patchJson("/api/v1/requests/{$request->id}", [
            'company_id' => $newCompany->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'title' => 'Updated request title',
            'status' => RequestStatus::WAITING_CLIENT->value,
            'priority' => RequestPriority::URGENT->value,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.company.id', $newCompany->id);
        $response->assertJsonPath('data.contact.id', $contact->id);
        $response->assertJsonPath('data.opportunity.id', $opportunity->id);
        $response->assertJsonPath('data.title', 'Updated request title');
        $response->assertJsonPath('data.priority', RequestPriority::URGENT->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.updated']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.updated']);
    }

    public function test_update_company_change_must_preserve_existing_contact_and_opportunity_consistency(): void
    {
        $company = Company::factory()->create();
        $newCompany = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);
        $request = BusinessRequest::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
        ]);

        $this->actingAs($this->admin);

        $this->patchJson("/api/v1/requests/{$request->id}", [
            'company_id' => $newCompany->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['contact_id', 'opportunity_id']);
    }

    public function test_update_rejects_assignment_and_system_fields(): void
    {
        $request = BusinessRequest::factory()->create();
        $assignee = Employee::factory()->create();

        $this->actingAs($this->admin);

        $this->patchJson("/api/v1/requests/{$request->id}", [
            'assigned_to' => $assignee->id,
            'reference' => 'BAD-REF',
            'started_at' => now()->toDateTimeString(),
        ])->assertStatus(422)->assertJsonValidationErrors(['assigned_to', 'reference', 'started_at']);
    }

    public function test_status_timestamp_integrity(): void
    {
        $request = BusinessRequest::factory()->create([
            'status' => RequestStatus::NEW->value,
            'started_at' => null,
            'completed_at' => null,
        ]);

        $this->actingAs($this->admin);

        $response = $this->patchJson("/api/v1/requests/{$request->id}", [
            'status' => RequestStatus::IN_PROGRESS->value,
        ]);
        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.started_at'));
        $this->assertNull($response->json('data.completed_at'));

        $response = $this->patchJson("/api/v1/requests/{$request->id}", [
            'status' => RequestStatus::COMPLETED->value,
        ]);
        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.completed_at'));

        $response = $this->patchJson("/api/v1/requests/{$request->id}", [
            'status' => RequestStatus::IN_PROGRESS->value,
        ]);
        $response->assertStatus(200);
        $this->assertNull($response->json('data.completed_at'));
    }

    public function test_assign_and_reassign_request(): void
    {
        $request = BusinessRequest::factory()->create([
            'assigned_to' => null,
            'status' => RequestStatus::NEW->value,
        ]);
        $assignee = Employee::factory()->create();
        $newAssignee = Employee::factory()->create();

        $this->actingAs($this->admin);

        $response = $this->postJson("/api/v1/requests/{$request->id}/assign", [
            'assigned_to' => $assignee->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.assigned_to', $assignee->id);
        $response->assertJsonPath('data.status', RequestStatus::ASSIGNED->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.assigned']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.assigned']);
        $this->assertTrue($assignee->user->notifications()->count() > 0);

        $response = $this->postJson("/api/v1/requests/{$request->id}/assign", [
            'assigned_to' => $newAssignee->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.assigned_to', $newAssignee->id);
        $response->assertJsonPath('data.status', RequestStatus::ASSIGNED->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.reassigned']);
        $this->assertTrue($newAssignee->user->notifications()->count() > 0);
    }

    public function test_assign_requires_assign_permission(): void
    {
        $request = BusinessRequest::factory()->create();
        $assignee = Employee::factory()->create();
        $user = User::factory()->create();
        $user->givePermissionTo('view_requests', 'manage_requests');

        $this->actingAs($user);

        $this->postJson("/api/v1/requests/{$request->id}/assign", [
            'assigned_to' => $assignee->id,
        ])->assertStatus(403);
    }

    public function test_assignment_does_not_overwrite_advanced_statuses(): void
    {
        $statuses = [
            RequestStatus::IN_PROGRESS,
            RequestStatus::WAITING_CLIENT,
            RequestStatus::COMPLETED,
            RequestStatus::CANCELLED,
        ];

        $this->actingAs($this->admin);

        foreach ($statuses as $status) {
            $request = BusinessRequest::factory()->create([
                'assigned_to' => null,
                'status' => $status->value,
            ]);
            $assignee = Employee::factory()->create();

            $this->postJson("/api/v1/requests/{$request->id}/assign", [
                'assigned_to' => $assignee->id,
            ])->assertStatus(200)->assertJsonPath('data.status', $status->value);
        }
    }

    public function test_delete_soft_deletes_request_and_preserves_relationships(): void
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);
        $assignee = Employee::factory()->create();
        $request = BusinessRequest::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'assigned_to' => $assignee->id,
        ]);

        $this->actingAs($this->admin);

        $this->deleteJson("/api/v1/requests/{$request->id}")->assertStatus(200);

        $this->assertSoftDeleted('requests', ['id' => $request->id]);
        $this->assertDatabaseHas('companies', ['id' => $company->id]);
        $this->assertDatabaseHas('contacts', ['id' => $contact->id]);
        $this->assertDatabaseHas('opportunities', ['id' => $opportunity->id]);
        $this->assertDatabaseHas('employees', ['id' => $assignee->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.deleted']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'request.deleted']);
    }
}

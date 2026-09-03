<?php

namespace Tests\Feature\Leads;

use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;
use App\Models\Employee;
use App\Models\Company;
use App\Models\Contact;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class LeadApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Employee $adminEmployee;
    protected User $managerUser;
    protected Employee $managerEmployee;
    protected User $salesEmployee;
    protected Employee $salesEmployeeProfile;
    protected User $clientUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(\Database\Seeders\ServiceCatalogSeeder::class);

        Permission::firstOrCreate(['name' => 'view_leads']);
        Permission::firstOrCreate(['name' => 'manage_leads']);

        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'client']);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo(['view_leads', 'manage_leads']);
        
        $managerRole = Role::firstOrCreate(['name' => 'manager']);
        $managerRole->givePermissionTo(['view_leads', 'manage_leads']);

        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('admin');
        $this->adminEmployee = Employee::factory()->create(['user_id' => $this->adminUser->id]);

        $this->managerUser = User::factory()->create();
        $this->managerUser->assignRole('manager');
        $this->managerEmployee = Employee::factory()->create(['user_id' => $this->managerUser->id]);

        $this->salesEmployee = User::factory()->create();
        $this->salesEmployee->givePermissionTo(['view_leads', 'manage_leads']);
        $this->salesEmployeeProfile = Employee::factory()->create(['user_id' => $this->salesEmployee->id]);

        $this->clientUser = User::factory()->create();
        $this->clientUser->assignRole('client');
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/leads')->assertUnauthorized();
    }

    public function test_client_denied()
    {
        $this->actingAs($this->clientUser)->getJson('/api/v1/leads')->assertForbidden();
    }

    public function test_create_external_lead()
    {
        $payload = [
            'person_name' => 'John Doe',
            'company_name' => 'Acme Corp',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'source' => 'website',
            'service_interest' => 'general_business'
        ];

        $response = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', $payload);

        $response->assertCreated();
        $this->assertDatabaseHas('leads', [
            'person_name' => 'John Doe',
            'company_name' => 'Acme Corp',
            'email' => 'john@example.com'
        ]);
    }

    public function test_create_linked_lead()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);

        $payload = [
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'source' => 'referral'
        ];

        $response = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', $payload);

        $response->assertCreated();
        $this->assertDatabaseHas('leads', [
            'company_id' => $company->id,
            'contact_id' => $contact->id
        ]);
    }

    public function test_lead_resource_returns_real_contact_and_assigned_employee_summary()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create([
            'company_id' => $company->id,
            'first_name' => 'Mona',
            'last_name' => 'Saleh',
        ]);
        $assigneeUser = User::factory()->create([
            'name' => 'Assigned Manager',
            'username' => 'assigned.manager',
            'email' => 'assigned.manager@example.com',
        ]);
        $assignee = Employee::factory()->create([
            'user_id' => $assigneeUser->id,
            'employee_code' => 'LM-EMP-900001',
        ]);
        $lead = Lead::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'assigned_to' => $assignee->id,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)->getJson("/api/v1/leads/{$lead->id}");

        $response->assertOk()
            ->assertJsonPath('data.contact.id', $contact->id)
            ->assertJsonPath('data.contact.reference', $contact->reference)
            ->assertJsonPath('data.contact.first_name', 'Mona')
            ->assertJsonPath('data.contact.last_name', 'Saleh')
            ->assertJsonPath('data.contact.full_name', 'Mona Saleh')
            ->assertJsonPath('data.assigned_employee.id', $assignee->id)
            ->assertJsonPath('data.assigned_employee.employee_code', 'LM-EMP-900001')
            ->assertJsonPath('data.assigned_employee.user.id', $assigneeUser->id)
            ->assertJsonPath('data.assigned_employee.user.name', 'Assigned Manager')
            ->assertJsonPath('data.assigned_employee.user.username', 'assigned.manager')
            ->assertJsonPath('data.assigned_employee.user.email', 'assigned.manager@example.com');
    }

    public function test_create_lead_can_still_accept_initial_assignment()
    {
        $response = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', [
            'person_name' => 'Assigned On Create',
            'assigned_to' => $this->salesEmployeeProfile->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.assigned_to', $this->salesEmployeeProfile->id)
            ->assertJsonPath('data.assigned_employee.id', $this->salesEmployeeProfile->id)
            ->assertJsonPath('data.assigned_employee.user.name', $this->salesEmployee->name);
    }

    public function test_invalid_company_contact_combination()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company2->id]);

        $payload = [
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ];

        $response = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', $payload);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['contact_id']);
    }

    public function test_prevent_converted_status_on_creation()
    {
        $payload = [
            'person_name' => 'John',
            'status' => 'converted'
        ];

        $response = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', $payload);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['status']);
    }

    public function test_prevent_manual_conversion_on_update()
    {
        $lead = Lead::factory()->create(['created_by' => $this->adminUser->id]);

        $response = $this->actingAs($this->adminUser)->putJson("/api/v1/leads/{$lead->id}", [
            'status' => 'converted'
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['status']);
    }

    public function test_assign_lead()
    {
        $lead = Lead::factory()->create(['created_by' => $this->adminUser->id]);

        $response = $this->actingAs($this->adminUser)->postJson("/api/v1/leads/{$lead->id}/assign", [
            'assigned_to' => $this->salesEmployeeProfile->id
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'assigned_to' => $this->salesEmployeeProfile->id
        ]);
    }

    public function test_dedicated_assign_can_reassign_lead()
    {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->managerEmployee->id,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson("/api/v1/leads/{$lead->id}/assign", [
            'assigned_to' => $this->salesEmployeeProfile->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.assigned_to', $this->salesEmployeeProfile->id);
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'assigned_to' => $this->salesEmployeeProfile->id,
        ]);
    }

    public function test_generic_patch_cannot_reassign_lead()
    {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->managerEmployee->id,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)->patchJson("/api/v1/leads/{$lead->id}", [
            'assigned_to' => $this->salesEmployeeProfile->id,
            'person_name' => 'Still Normal Update',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.person_name', 'Still Normal Update')
            ->assertJsonPath('data.assigned_to', $this->managerEmployee->id);
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'assigned_to' => $this->managerEmployee->id,
            'person_name' => 'Still Normal Update',
        ]);
    }

    public function test_lead_audit_logs_use_canonical_context()
    {
        $createResponse = $this->actingAs($this->adminUser)->postJson('/api/v1/leads', [
            'person_name' => 'Audited Lead',
        ]);
        $createResponse->assertCreated();
        $leadId = $createResponse->json('data.id');

        $this->actingAs($this->adminUser)->patchJson("/api/v1/leads/{$leadId}", [
            'person_name' => 'Audited Lead Updated',
        ])->assertOk();

        $this->actingAs($this->adminUser)->postJson("/api/v1/leads/{$leadId}/assign", [
            'assigned_to' => $this->salesEmployeeProfile->id,
        ])->assertOk();

        $this->actingAs($this->adminUser)->deleteJson("/api/v1/leads/{$leadId}")
            ->assertNoContent();

        foreach (['lead.created', 'lead.updated', 'lead.assigned', 'lead.deleted'] as $action) {
            $log = AuditLog::where('action', $action)
                ->where('subject_type', Lead::class)
                ->where('subject_id', $leadId)
                ->first();

            $this->assertNotNull($log, "Missing {$action} audit log.");
            $this->assertIsArray($log->request_context);
            $this->assertArrayHasKey('ip', $log->request_context);
            $this->assertArrayHasKey('user_agent', $log->request_context);
        }
    }

    public function test_employee_visibility_scope()
    {
        $lead1 = Lead::factory()->create(['assigned_to' => $this->salesEmployeeProfile->id]);
        $lead2 = Lead::factory()->create(['assigned_to' => $this->managerEmployee->id]);

        $response = $this->actingAs($this->salesEmployee)->getJson('/api/v1/leads');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($lead1->id, $data[0]['id']);
    }
}

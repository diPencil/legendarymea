<?php

namespace Tests\Feature\Leads;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;

class LeadConversionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected User $client;
    protected Lead $lead;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        Employee::factory()->create(['user_id' => $this->admin->id]);

        $this->employeeUser = User::factory()->create();
        $this->employeeUser->assignRole('employee');
        $this->employee = Employee::factory()->create(['user_id' => $this->employeeUser->id]);

        $this->client = User::factory()->create();
        $this->client->assignRole('client');

        $this->lead = Lead::factory()->create(['assigned_to' => $this->employee->id]);
    }

    public function test_unauthenticated_denied()
    {
        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", []);
        $response->assertStatus(401);
    }

    public function test_unauthorized_denied()
    {
        $this->employeeUser->removeRole('employee'); // Remove role so user loses convert_leads permission
        $this->actingAs($this->employeeUser);
        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Mega Corp']],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Jane', 'last_name' => 'Doe']],
            'opportunity' => ['name' => 'Mega Deal']
        ];
        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(403);
    }

    public function test_client_denied()
    {
        $this->actingAs($this->client);
        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Mega Corp']],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Jane', 'last_name' => 'Doe']],
            'opportunity' => ['name' => 'Mega Deal']
        ];
        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(403);
    }

    public function test_super_admin_bypass()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');
        
        $this->actingAs($superAdmin);
        
        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'New Corp']],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'John']],
            'opportunity' => ['name' => 'First Deal']
        ];
        
        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(200);
    }

    public function test_external_lead_new_company_contact_opportunity()
    {
        $this->actingAs($this->admin);

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Mega Corp']],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Jane', 'last_name' => 'Doe']],
            'opportunity' => ['name' => 'Mega Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertNotNull($data['company']['id']);
        $this->assertNotNull($data['contact']['id']);
        $this->assertNotNull($data['opportunity']['id']);

        $this->assertEquals('Mega Corp', $data['company']['name']);
        $this->assertEquals('Jane', $data['contact']['first_name']);
        $this->assertEquals('Mega Deal', $data['opportunity']['name']);

        $this->lead->refresh();
        $this->assertEquals(LeadStatus::CONVERTED, $this->lead->status);
        $this->assertNotNull($this->lead->converted_at);
        $this->assertEquals($data['company']['id'], $this->lead->company_id);
        $this->assertEquals($data['contact']['id'], $this->lead->contact_id);

        $opp = Opportunity::find($data['opportunity']['id']);
        $this->assertEquals($this->lead->id, $opp->lead_id);
        $this->assertEquals($data['company']['id'], $opp->company_id);
        $this->assertEquals($data['contact']['id'], $opp->primary_contact_id);
        $this->assertEquals($this->employee->id, $opp->owner_id); // Defaulted from lead assigned_to
        $this->assertEquals(OpportunityStage::QUALIFICATION->value, $opp->stage->value); // Default

        $this->assertDatabaseHas('company_relationships', [
            'company_id' => $data['company']['id'],
            'type' => 'prospect'
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'lead.converted']);
        $this->assertDatabaseHas('crm_activities', ['type' => 'lead.converted']);
    }

    public function test_external_lead_existing_company_new_contact()
    {
        $this->actingAs($this->admin);
        $company = Company::factory()->create();

        $payload = [
            'company' => ['mode' => 'existing', 'id' => $company->id],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Alice']],
            'opportunity' => ['name' => 'Alice Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals($company->id, $data['company']['id']);
        $this->assertNotNull($data['contact']['id']);

        $contact = Contact::find($data['contact']['id']);
        $this->assertEquals($company->id, $contact->company_id);
    }

    public function test_external_lead_existing_company_existing_contact()
    {
        $this->actingAs($this->admin);
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);

        $payload = [
            'company' => ['mode' => 'existing', 'id' => $company->id],
            'contact' => ['mode' => 'existing', 'id' => $contact->id],
            'opportunity' => ['name' => 'Existing Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals($company->id, $data['company']['id']);
        $this->assertEquals($contact->id, $data['contact']['id']);
    }

    public function test_company_contact_mismatch_rejected()
    {
        $this->actingAs($this->admin);
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $otherCompany->id]);

        $payload = [
            'company' => ['mode' => 'existing', 'id' => $company->id],
            'contact' => ['mode' => 'existing', 'id' => $contact->id],
            'opportunity' => ['name' => 'Mismatch Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['contact.id']);
    }

    public function test_lead_already_linked_company_contact_creates_opportunity()
    {
        $this->actingAs($this->admin);
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        
        $this->lead->update(['company_id' => $company->id, 'contact_id' => $contact->id]);

        $payload = [
            'company' => ['mode' => 'existing', 'id' => $company->id],
            'contact' => ['mode' => 'existing', 'id' => $contact->id],
            'opportunity' => ['name' => 'Linked Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(200);
    }

    public function test_lead_already_converted_rejected()
    {
        $this->actingAs($this->admin);
        $this->lead->update(['status' => LeadStatus::CONVERTED, 'converted_at' => now()]);

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'New Corp']],
            'contact' => ['mode' => 'none'],
            'opportunity' => ['name' => 'Late Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(409);
    }

    public function test_duplicate_company_conflict()
    {
        $this->actingAs($this->admin);
        Company::factory()->create(['name' => 'Global Tech']);

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Global Tech']],
            'contact' => ['mode' => 'none'],
            'opportunity' => ['name' => 'Conflict Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(409);
        $this->assertStringContainsString('Duplicate company detected', $response->json('message'));
    }

    public function test_duplicate_contact_conflict()
    {
        $this->actingAs($this->admin);
        $company = Company::factory()->create();
        Contact::factory()->create(['company_id' => $company->id, 'first_name' => 'Bob', 'last_name' => 'Smith']);

        $payload = [
            'company' => ['mode' => 'existing', 'id' => $company->id],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Bob', 'last_name' => 'Smith']],
            'opportunity' => ['name' => 'Conflict Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(409);
        $this->assertStringContainsString('Duplicate contact detected', $response->json('message'));
    }

    public function test_won_lost_initial_conversion_rejected()
    {
        $this->actingAs($this->admin);

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Acme']],
            'contact' => ['mode' => 'none'],
            'opportunity' => ['name' => 'Lost Deal', 'stage' => OpportunityStage::LOST->value]
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['opportunity.stage']);
    }

    public function test_direct_patch_converted_rejected()
    {
        $this->actingAs($this->admin);
        $response = $this->patchJson("/api/v1/leads/{$this->lead->id}", [
            'status' => LeadStatus::CONVERTED->value
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
    }

    public function test_soft_deleted_lead_rejected()
    {
        $this->actingAs($this->admin);
        $this->lead->delete();

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'New Corp']],
            'contact' => ['mode' => 'none'],
            'opportunity' => ['name' => 'Ghost Deal']
        ];

        // Should return 404 because of route model binding
        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(404);
    }

    public function test_transaction_rollback_on_failure()
    {
        $this->actingAs($this->admin);

        // Mock CreateOpportunityService to throw an exception
        $mock = \Mockery::mock(\App\Services\CreateOpportunityService::class);
        $mock->shouldReceive('execute')->andThrow(new \Exception("Simulated failure"));
        $this->app->instance(\App\Services\CreateOpportunityService::class, $mock);

        $payload = [
            'company' => ['mode' => 'create', 'data' => ['name' => 'Rollback Corp']],
            'contact' => ['mode' => 'create', 'data' => ['first_name' => 'Rollback Jane']],
            'opportunity' => ['name' => 'Rollback Deal']
        ];

        $response = $this->postJson("/api/v1/leads/{$this->lead->id}/convert", $payload);
        $response->assertStatus(500);

        // Verify lead remains unconverted
        $this->lead->refresh();
        $this->assertNotEquals(LeadStatus::CONVERTED, $this->lead->status);
        $this->assertNull($this->lead->converted_at);

        // Verify no orphan company remains
        $this->assertDatabaseMissing('companies', ['name' => 'Rollback Corp']);

        // Verify no orphan contact remains
        $this->assertDatabaseMissing('contacts', ['first_name' => 'Rollback Jane']);

        // Verify no partial opportunity remains
        $this->assertDatabaseMissing('opportunities', ['name' => 'Rollback Deal']);
    }
}

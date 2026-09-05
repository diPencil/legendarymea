<?php

namespace Tests\Feature\Opportunities;

use App\Models\User;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Employee;
use App\Models\Opportunity;

use App\Models\AuditLog;
use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpportunityApiTest extends TestCase
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

    public function test_auth_required()
    {
        $response = $this->getJson('/api/v1/opportunities');
        $response->assertStatus(401);
    }

    public function test_client_denied()
    {
        $this->actingAs($this->client);
        $response = $this->getJson('/api/v1/opportunities');
        $response->assertStatus(403);
    }

    public function test_admin_can_list_opportunities()
    {
        Opportunity::factory()->count(3)->create();
        $this->actingAs($this->admin);
        $response = $this->getJson('/api/v1/opportunities');
        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_employee_ownership_scope()
    {
        Opportunity::factory()->count(2)->create(['owner_id' => $this->employee->id]);
        Opportunity::factory()->count(3)->create(); // other owner

        $this->actingAs($this->employeeUser);
        $response = $this->getJson('/api/v1/opportunities');
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_create_opportunity()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $lead = Lead::factory()->create(['company_id' => $company->id]);

        $payload = [
            'name' => 'Big Deal',
            'company_id' => $company->id,
            'primary_contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'owner_id' => $this->employee->id,
            'probability' => 75,
            'estimated_value' => 50000,
            'currency' => 'USD',
        ];

        $this->actingAs($this->admin);
        $response = $this->postJson('/api/v1/opportunities', $payload);
        $response->assertStatus(201);
        
        $data = $response->json('data');
        $this->assertEquals('Big Deal', $data['name']);
        $this->assertNotNull($data['reference']);
        $this->assertEquals(OpportunityStage::QUALIFICATION->value, $data['stage']);
        
        $this->assertDatabaseHas('opportunities', ['id' => $data['id']]);
        
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.created']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.created']);

        // Verify Lead remained untouched
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'status' => LeadStatus::NEW->value,
            'converted_at' => null
        ]);
    }

    public function test_cross_company_lead_is_rejected()
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $lead = Lead::factory()->create(['company_id' => $companyA->id]);

        $this->actingAs($this->admin);
        $response = $this->postJson('/api/v1/opportunities', [
            'name' => 'Mismatched Lead Deal',
            'company_id' => $companyB->id,
            'lead_id' => $lead->id,
            'owner_id' => $this->employee->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['lead_id']);
    }

    public function test_compatible_lead_is_accepted_and_state_is_unchanged()
    {
        $company = Company::factory()->create();
        $lead = Lead::factory()->create([
            'company_id' => $company->id,
            'status' => LeadStatus::CONTACTED->value,
            'converted_at' => null,
        ]);

        $this->actingAs($this->admin);
        $response = $this->postJson('/api/v1/opportunities', [
            'name' => 'Compatible Lead Deal',
            'company_id' => $company->id,
            'lead_id' => $lead->id,
            'owner_id' => $this->employee->id,
            'stage' => OpportunityStage::DISCOVERY->value,
        ]);

        $response->assertStatus(201);
        $this->assertEquals(OpportunityStage::DISCOVERY->value, $response->json('data.stage'));

        $lead->refresh();
        $this->assertSame(LeadStatus::CONTACTED, $lead->status);
        $this->assertNull($lead->converted_at);
        $this->assertSame($company->id, $lead->company_id);
        $this->assertNull($lead->contact_id);
    }

    public function test_mismatched_contact_rejected()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact2 = Contact::factory()->create(['company_id' => $company2->id]);

        $payload = [
            'name' => 'Bad Deal',
            'company_id' => $company1->id,
            'primary_contact_id' => $contact2->id,
            'owner_id' => $this->employee->id,
        ];

        $this->actingAs($this->admin);
        $response = $this->postJson('/api/v1/opportunities', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['primary_contact_id']);
    }

    public function test_assign_opportunity()
    {
        $opportunity = Opportunity::factory()->create();
        $newEmployee = Employee::factory()->create();
        $newEmployee->user->assignRole('employee');

        $this->actingAs($this->admin);
        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/assign", [
            'owner_id' => $newEmployee->id
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals($newEmployee->id, $response->json('data.owner.id'));

        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.reassigned']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.reassigned']);

        // Check notification
        $this->assertTrue($newEmployee->user->notifications()->count() > 0);
    }

    public function test_owner_resource_uses_current_employee_and_user_fields()
    {
        $ownerUser = User::factory()->create([
            'name' => 'Owner Name',
            'username' => 'owner.user',
            'email' => 'owner@example.test',
        ]);
        $owner = Employee::factory()->create([
            'user_id' => $ownerUser->id,
            'employee_code' => 'LM-EMP-900001',
        ]);
        $opportunity = Opportunity::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($this->admin);
        $response = $this->getJson("/api/v1/opportunities/{$opportunity->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.owner.id', $owner->id);
        $response->assertJsonPath('data.owner.employee_code', 'LM-EMP-900001');
        $response->assertJsonPath('data.owner.user.id', $ownerUser->id);
        $response->assertJsonPath('data.owner.user.name', 'Owner Name');
        $response->assertJsonPath('data.owner.user.username', 'owner.user');
        $response->assertJsonPath('data.owner.user.email', 'owner@example.test');
        $this->assertArrayNotHasKey('reference', $response->json('data.owner'));
    }

    public function test_stage_lifecycle()
    {
        $opportunity = Opportunity::factory()->create(['stage' => OpportunityStage::QUALIFICATION->value]);
        $this->actingAs($this->admin);

        // Move to negotiation
        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/stage", [
            'stage' => OpportunityStage::NEGOTIATION->value
        ]);
        $response->assertStatus(200);
        $this->assertEquals(OpportunityStage::NEGOTIATION->value, $response->json('data.stage'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.stage_changed']);

        // Move to won
        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/stage", [
            'stage' => OpportunityStage::WON->value
        ]);
        $response->assertStatus(200);
        $this->assertEquals(OpportunityStage::WON->value, $response->json('data.stage'));
        $this->assertNotNull($response->json('data.closed_at'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.won']);

        // Reopen
        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/stage", [
            'stage' => OpportunityStage::DISCOVERY->value
        ]);
        $response->assertStatus(200);
        $this->assertEquals(OpportunityStage::DISCOVERY->value, $response->json('data.stage'));
        $this->assertNull($response->json('data.closed_at'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'opportunity.reopened']);

        // Move to lost
        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/stage", [
            'stage' => OpportunityStage::LOST->value,
            'lost_reason' => 'Too expensive'
        ]);
        $response->assertStatus(200);
        $this->assertEquals(OpportunityStage::LOST->value, $response->json('data.stage'));
        $this->assertNotNull($response->json('data.closed_at'));
        $this->assertEquals('Too expensive', $response->json('data.lost_reason'));
    }

    public function test_generic_patch_stage_protection()
    {
        $opportunity = Opportunity::factory()->create(['stage' => OpportunityStage::QUALIFICATION->value]);
        $this->actingAs($this->admin);

        $response = $this->patchJson("/api/v1/opportunities/{$opportunity->id}", [
            'name' => 'Renamed Deal',
            'stage' => OpportunityStage::WON->value,
            'closed_at' => now(),
        ]);
        $response->assertStatus(200);
        $this->assertEquals('Renamed Deal', $response->json('data.name'));
        
        // Stage should not have changed
        $this->assertEquals(OpportunityStage::QUALIFICATION->value, $response->json('data.stage'));
        $this->assertNull($response->json('data.closed_at'));
    }

    public function test_generic_patch_owner_protection()
    {
        $currentOwner = Employee::factory()->create();
        $newOwner = Employee::factory()->create();
        $opportunity = Opportunity::factory()->create(['owner_id' => $currentOwner->id]);
        $this->actingAs($this->admin);

        $response = $this->patchJson("/api/v1/opportunities/{$opportunity->id}", [
            'name' => 'Owner Locked Deal',
            'owner_id' => $newOwner->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.name', 'Owner Locked Deal');
        $response->assertJsonPath('data.owner.id', $currentOwner->id);
        $this->assertDatabaseHas('opportunities', [
            'id' => $opportunity->id,
            'owner_id' => $currentOwner->id,
        ]);
    }

    public function test_company_change_clears_incompatible_primary_contact()
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $contactA = Contact::factory()->create(['company_id' => $companyA->id]);
        $opportunity = Opportunity::factory()->create([
            'company_id' => $companyA->id,
            'primary_contact_id' => $contactA->id,
        ]);

        $this->actingAs($this->admin);
        $response = $this->patchJson("/api/v1/opportunities/{$opportunity->id}", [
            'company_id' => $companyB->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.company.id', $companyB->id);
        $response->assertJsonPath('data.primary_contact', null);
        $this->assertDatabaseHas('opportunities', [
            'id' => $opportunity->id,
            'company_id' => $companyB->id,
            'primary_contact_id' => null,
        ]);
    }

    public function test_company_change_clears_incompatible_source_lead()
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $lead = Lead::factory()->create(['company_id' => $companyA->id]);
        $opportunity = Opportunity::factory()->create([
            'company_id' => $companyA->id,
            'lead_id' => $lead->id,
        ]);

        $this->actingAs($this->admin);
        $response = $this->patchJson("/api/v1/opportunities/{$opportunity->id}", [
            'company_id' => $companyB->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.company.id', $companyB->id);
        $response->assertJsonPath('data.source_lead', null);
        $this->assertDatabaseHas('opportunities', [
            'id' => $opportunity->id,
            'company_id' => $companyB->id,
            'lead_id' => null,
        ]);
    }

    public function test_soft_delete_preserves_relationships()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $lead = Lead::factory()->create();
        $owner = Employee::factory()->create();

        $opportunity = Opportunity::factory()->create([
            'company_id' => $company->id,
            'primary_contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'owner_id' => $owner->id
        ]);

        $this->actingAs($this->admin);
        $response = $this->deleteJson("/api/v1/opportunities/{$opportunity->id}");
        $response->assertStatus(200);

        // Verify opportunity is soft deleted
        $this->assertSoftDeleted('opportunities', ['id' => $opportunity->id]);

        // Verify relationships survived
        $this->assertDatabaseHas('companies', ['id' => $company->id]);
        $this->assertDatabaseHas('contacts', ['id' => $contact->id]);
        $this->assertDatabaseHas('leads', ['id' => $lead->id]);
        $this->assertDatabaseHas('employees', ['id' => $owner->id]);
    }

    public function test_search_and_filter()
    {
        $company = Company::factory()->create(['name' => 'Filter Company']);
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $lead = Lead::factory()->create(['company_id' => $company->id]);
        $owner = Employee::factory()->create();
        $opportunity1 = Opportunity::factory()->create([
            'name' => 'Alpha Deal',
            'stage' => OpportunityStage::QUALIFICATION->value,
            'company_id' => $company->id,
            'primary_contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'owner_id' => $owner->id,
            'service_interest' => 'general_business',
            'currency' => 'USD',
            'expected_close_date' => '2026-08-20',
            'created_at' => '2026-08-10 09:00:00',
        ]);
        $opportunity2 = Opportunity::factory()->won()->create([
            'name' => 'Beta Deal',
            'company_id' => $company->id,
            'owner_id' => $owner->id,
            'service_interest' => 'corporate_travel',
            'currency' => 'AED',
            'expected_close_date' => '2026-09-15',
            'created_at' => '2026-09-01 09:00:00',
        ]);
        $opportunity3 = Opportunity::factory()->create([
            'name' => 'Gamma Project',
            'stage' => OpportunityStage::QUALIFICATION->value,
            'service_interest' => 'hr_solutions',
            'currency' => 'EUR',
            'expected_close_date' => '2026-10-01',
            'created_at' => '2026-10-01 09:00:00',
        ]);

        $this->actingAs($this->admin);
        
        $response = $this->getJson('/api/v1/opportunities?search=Deal');
        $this->assertCount(2, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?stage=' . OpportunityStage::QUALIFICATION->value);
        $this->assertCount(2, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?search=Gamma');
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson("/api/v1/opportunities?owner_id={$owner->id}");
        $this->assertCount(2, $response->json('data'));

        $response = $this->getJson("/api/v1/opportunities?company_id={$company->id}");
        $this->assertCount(2, $response->json('data'));

        $response = $this->getJson("/api/v1/opportunities?primary_contact_id={$contact->id}");
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson("/api/v1/opportunities?lead_id={$lead->id}");
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?service_interest=general_business');
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?currency=USD');
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?close_from=2026-08-01&close_to=2026-08-31');
        $this->assertCount(1, $response->json('data'));

        $response = $this->getJson('/api/v1/opportunities?created_from=2026-08-10&created_to=2026-08-10');
        $this->assertCount(1, $response->json('data'));
    }
}

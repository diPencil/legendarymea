<?php

namespace Tests\Feature\FollowUps;

use App\Enums\FollowUpStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FollowUpApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    private function getAuthUser(string $role = 'admin')
    {
        $user = User::factory()->create();
        $user->assignRole($role);
        
        if ($role === 'employee') {
            Employee::factory()->create(['user_id' => $user->id]);
        }
        
        return $user;
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/follow-ups')->assertUnauthorized();
    }

    public function test_permission_required_for_list()
    {
        $client = $this->getAuthUser('client');
        $this->actingAs($client)->getJson('/api/v1/follow-ups')->assertForbidden();
    }

    public function test_list_supports_pagination_search_filters_and_sorting()
    {
        $admin = $this->getAuthUser('admin');
        
        FollowUp::factory()->create([
            'title' => 'First FollowUp',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDays(2),
        ]);
        
        FollowUp::factory()->create([
            'title' => 'Second FollowUp',
            'status' => FollowUpStatus::COMPLETED,
            'follow_up_at' => now()->addDays(5),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/follow-ups?search=First');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));

        $response = $this->actingAs($admin)->getJson('/api/v1/follow-ups?status=completed');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        
        $response = $this->actingAs($admin)->getJson('/api/v1/follow-ups?sort_by=follow_up_at&sort_dir=desc');
        $response->assertOk();
        $this->assertEquals('Second FollowUp', $response->json('data.0.title'));
    }

    public function test_overdue_filter_works()
    {
        $admin = $this->getAuthUser('admin');
        
        // Pending, future (not overdue)
        FollowUp::factory()->create([
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDays(1),
        ]);

        // Pending, past (overdue)
        $overdue = FollowUp::factory()->create([
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->subDays(1),
        ]);

        // Completed, past (not overdue)
        FollowUp::factory()->create([
            'status' => FollowUpStatus::COMPLETED,
            'follow_up_at' => now()->subDays(1),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/follow-ups?overdue=1');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($overdue->id, $response->json('data.0.id'));
        $this->assertTrue($response->json('data.0.is_overdue'));
    }

    public function test_create_valid_follow_up()
    {
        $admin = $this->getAuthUser('admin');
        
        $response = $this->actingAs($admin)->postJson('/api/v1/follow-ups', [
            'title' => 'New Action',
            'notes' => 'Some notes',
            'follow_up_at' => now()->addDay()->toDateTimeString(),
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('data.reference'));
        $this->assertEquals('New Action', $response->json('data.title'));
        $this->assertEquals('pending', $response->json('data.status')); // Default
    }

    public function test_create_requires_follow_up_at()
    {
        $admin = $this->getAuthUser('admin');
        
        $response = $this->actingAs($admin)->postJson('/api/v1/follow-ups', [
            'title' => 'Missing date',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['follow_up_at']);
    }

    public function test_cross_company_contact_rejected()
    {
        $admin = $this->getAuthUser('admin');
        
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company2->id]);

        $response = $this->actingAs($admin)->postJson('/api/v1/follow-ups', [
            'title' => 'Cross Company',
            'follow_up_at' => now()->addDay()->toDateTimeString(),
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['contact_id']);
    }

    public function test_update_normal_fields_and_clearing()
    {
        $admin = $this->getAuthUser('admin');
        
        $company = Company::factory()->create();
        $followUp = FollowUp::factory()->create([
            'notes' => 'Old notes',
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'notes' => null, // clear
            'company_id' => null, // clear
        ]);

        $response->assertOk();
        $this->assertNull($response->json('data.notes'));
        $this->assertNull($response->json('data.company'));
    }

    public function test_company_change_clears_stale_relations()
    {
        $admin = $this->getAuthUser('admin');
        
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company1->id]);
        
        $followUp = FollowUp::factory()->create([
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'company_id' => $company2->id,
        ]);

        $response->assertOk();
        $this->assertEquals($company2->id, $response->json('data.company.id'));
        $this->assertNull($response->json('data.contact')); // Cleared
    }

    public function test_generic_assignment_bypass_blocked()
    {
        $admin = $this->getAuthUser('admin');
        $employee = Employee::factory()->create();
        
        $followUp = FollowUp::factory()->create(['assigned_to' => null]);

        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'assigned_to' => $employee->id,
        ]);

        $response->assertOk();
        $this->assertNull($response->json('data.assignee')); // Unchanged
    }

    public function test_dedicated_assignment()
    {
        $admin = $this->getAuthUser('admin');
        $employee = Employee::factory()->create();
        
        $followUp = FollowUp::factory()->create(['assigned_to' => null]);

        $response = $this->actingAs($admin)->postJson("/api/v1/follow-ups/{$followUp->id}/assign", [
            'assigned_to' => $employee->id,
        ]);

        $response->assertOk();
        $this->assertEquals($employee->id, $response->json('data.assignee.employee.id'));
    }

    public function test_completion_and_cancellation_lifecycle()
    {
        $admin = $this->getAuthUser('admin');
        $followUp = FollowUp::factory()->create([
            'status' => FollowUpStatus::PENDING,
            'completed_at' => null,
        ]);

        // Complete
        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'status' => 'completed',
        ]);
        $response->assertOk();
        $this->assertNotNull($response->json('data.completed_at'));

        // Reopen to pending
        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'status' => 'pending',
        ]);
        $response->assertOk();
        $this->assertNull($response->json('data.completed_at'));

        // Cancel
        $response = $this->actingAs($admin)->putJson("/api/v1/follow-ups/{$followUp->id}", [
            'status' => 'cancelled',
        ]);
        $response->assertOk();
        $this->assertNull($response->json('data.completed_at'));
    }

    public function test_delete_soft_deletes()
    {
        $admin = $this->getAuthUser('admin');
        $followUp = FollowUp::factory()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/follow-ups/{$followUp->id}");
        $response->assertOk();

        $this->assertSoftDeleted('follow_ups', ['id' => $followUp->id]);
    }
}

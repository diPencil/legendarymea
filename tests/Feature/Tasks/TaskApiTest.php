<?php

namespace Tests\Feature\Tasks;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request as BusinessRequest;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/tasks')->assertUnauthorized();
        $this->postJson('/api/v1/tasks')->assertUnauthorized();
    }

    public function test_permission_required_for_list_and_show()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/tasks')->assertForbidden();
        
        $task = Task::factory()->create();
        $this->actingAs($user)->getJson("/api/v1/tasks/{$task->id}")->assertForbidden();
    }

    public function test_list_supports_pagination_search_filters_and_sorting()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_tasks');

        Task::factory()->count(15)->create();
        $specificTask = Task::factory()->create([
            'title' => 'Specific Unique Title XYZ',
            'status' => TaskStatus::COMPLETED,
            'priority' => TaskPriority::HIGH,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/tasks');
        $response->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page']]);

        $response = $this->actingAs($user)->getJson('/api/v1/tasks?search=Unique Title XYZ');
        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specificTask->id);

        $response = $this->actingAs($user)->getJson('/api/v1/tasks?status=completed&priority=high');
        $response->assertOk();
    }

    public function test_create_valid_task_with_canonical_reference_and_relationships()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $company = Company::factory()->create();
        
        $response = $this->actingAs($user)->postJson('/api/v1/tasks', [
            'title' => 'New Task',
            'description' => 'Some desc',
            'company_id' => $company->id,
            'status' => 'in_progress',
        ]);

        $response->assertCreated();
        
        $taskId = $response->json('data.id');
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'title' => 'New Task',
            'company_id' => $company->id,
            'status' => 'in_progress',
            'created_by' => $user->id,
        ]);
        
        $task = Task::find($taskId);
        $this->assertMatchesRegularExpression('/^LM-TSK-\d{4}-\d{6}$/', $task->reference);
        $this->assertNotNull($task->started_at); // from in_progress
    }

    public function test_contact_and_opportunity_company_mismatches_are_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();

        $contact = Contact::factory()->create(['company_id' => $company2->id]);
        
        $response = $this->actingAs($user)->postJson('/api/v1/tasks', [
            'title' => 'Test',
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contact_id']);
            
        $opportunity = Opportunity::factory()->create(['company_id' => $company2->id]);
        
        $response = $this->actingAs($user)->postJson('/api/v1/tasks', [
            'title' => 'Test',
            'company_id' => $company1->id,
            'opportunity_id' => $opportunity->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['opportunity_id']);
    }

    public function test_show_returns_task_resource()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_tasks');

        $task = Task::factory()->create();
        
        $response = $this->actingAs($user)->getJson("/api/v1/tasks/{$task->id}");
        
        $response->assertOk()
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.reference', $task->reference);
    }

    public function test_update_editable_fields_and_nullable_clearing()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $company = Company::factory()->create();
        $task = Task::factory()->create([
            'company_id' => $company->id,
            'description' => 'Original description',
        ]);
        
        $response = $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'title' => 'Updated Title',
            'description' => null,
            'company_id' => null,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Title',
            'description' => null,
            'company_id' => null,
        ]);
    }

    public function test_update_company_change_must_preserve_existing_contact_and_opportunity_consistency()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $company1 = Company::factory()->create();
        $contact1 = Contact::factory()->create(['company_id' => $company1->id]);
        
        $task = Task::factory()->create([
            'company_id' => $company1->id,
            'contact_id' => $contact1->id,
        ]);

        $company2 = Company::factory()->create();
        
        // Changing to company2 should clear contact1 as it's not compatible
        $response = $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'company_id' => $company2->id,
        ]);

        $response->assertOk();
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'company_id' => $company2->id,
            'contact_id' => null,
        ]);
    }

    public function test_update_rejects_assignment_and_system_fields()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $employee = Employee::factory()->create();
        $task = Task::factory()->create([
            'assigned_to' => null,
        ]);

        $response = $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'assigned_to' => $employee->id,
            'reference' => 'FAKE-REF',
        ]);

        $response->assertOk();
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'assigned_to' => null,
        ]);
        $this->assertDatabaseMissing('tasks', [
            'reference' => 'FAKE-REF',
        ]);
    }

    public function test_status_timestamp_integrity()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $task = Task::factory()->create([
            'status' => 'todo',
        ]);

        // todo -> in_progress (sets started_at)
        $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'status' => 'in_progress',
        ])->assertOk();
        
        $task->refresh();
        $this->assertNotNull($task->started_at);
        $this->assertNull($task->completed_at);
        $startedAt = $task->started_at;

        // in_progress -> waiting (preserves started_at)
        $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'status' => 'waiting',
        ])->assertOk();
        
        $task->refresh();
        $this->assertEquals($startedAt, $task->started_at);

        // waiting -> completed (sets completed_at)
        $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'status' => 'completed',
        ])->assertOk();
        
        $task->refresh();
        $this->assertEquals($startedAt, $task->started_at);
        $this->assertNotNull($task->completed_at);

        // completed -> todo (clears completed_at, clears started_at)
        $this->actingAs($user)->putJson("/api/v1/tasks/{$task->id}", [
            'status' => 'todo',
        ])->assertOk();

        $task->refresh();
        $this->assertNull($task->completed_at);
        $this->assertNull($task->started_at);
    }

    public function test_assign_and_reassign_task()
    {
        Notification::fake();
        
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');
        $user->givePermissionTo('assign_tasks');

        $employee = Employee::factory()->create();
        $task = Task::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/assign", [
            'assigned_to' => $employee->id,
        ]);

        $response->assertOk();
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'assigned_to' => $employee->id,
        ]);

        if ($employee->user) {
            Notification::assertSentTo($employee->user, TaskAssignedNotification::class);
        }
    }

    public function test_assign_requires_assign_permission()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks'); // but not assign_tasks

        $employee = Employee::factory()->create();
        $task = Task::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/v1/tasks/{$task->id}/assign", [
            'assigned_to' => $employee->id,
        ]);

        $response->assertForbidden();
    }

    public function test_delete_soft_deletes_task_and_logs_audit()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');

        $task = Task::factory()->create();
        
        $response = $this->actingAs($user)->deleteJson("/api/v1/tasks/{$task->id}");

        $response->assertOk();
        
        $this->assertSoftDeleted('tasks', [
            'id' => $task->id,
        ]);
        
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'task.deleted',
            'subject_id' => $task->id,
            'subject_type' => Task::class,
        ]);
    }
}

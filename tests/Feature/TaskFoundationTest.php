<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\User;
use App\Enums\TaskStatus;
use App\Enums\TaskPriority;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class TaskFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function setUp(): void
    {
        parent::setUp();
        
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
    }

    public function test_task_can_be_created_standalone()
    {
        $creator = User::factory()->create();

        $task = Task::factory()->create([
            'created_by' => $creator->id,
        ]);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'todo',
            'priority' => 'normal',
        ]);
        
        $this->assertNotNull($task->reference);
        $this->assertMatchesRegularExpression('/^LM-TSK-\d{4}-\d{6}$/', $task->reference);
    }

    public function test_task_reference_is_unique()
    {
        $task1 = Task::factory()->create();
        $task2 = Task::factory()->create();
        
        $this->assertNotEquals($task1->reference, $task2->reference);
    }

    public function test_task_may_link_company()
    {
        $company = Company::factory()->create();
        $task = Task::factory()->create([
            'company_id' => $company->id,
        ]);

        $this->assertEquals($company->id, $task->company->id);
    }

    public function test_task_may_link_contact()
    {
        $contact = Contact::factory()->create();
        $task = Task::factory()->create([
            'contact_id' => $contact->id,
        ]);

        $this->assertEquals($contact->id, $task->contact->id);
    }

    public function test_task_may_link_lead()
    {
        $lead = Lead::factory()->create();
        $task = Task::factory()->create([
            'lead_id' => $lead->id,
        ]);

        $this->assertEquals($lead->id, $task->lead->id);
    }

    public function test_task_may_link_opportunity()
    {
        $opportunity = Opportunity::factory()->create();
        $task = Task::factory()->create([
            'opportunity_id' => $opportunity->id,
        ]);

        $this->assertEquals($opportunity->id, $task->opportunity->id);
    }

    public function test_task_may_link_request()
    {
        $request = Request::factory()->create();
        $task = Task::factory()->create([
            'request_id' => $request->id,
        ]);

        $this->assertEquals($request->id, $task->request->id);
    }

    public function test_task_may_be_assigned_to_employee()
    {
        $employee = Employee::factory()->create();
        $task = Task::factory()->create([
            'assigned_to' => $employee->id,
        ]);

        $this->assertEquals($employee->id, $task->assignee->id);
    }

    public function test_creator_relationship_works()
    {
        $creator = User::factory()->create();
        $task = Task::factory()->create([
            'created_by' => $creator->id,
        ]);

        $this->assertEquals($creator->id, $task->creator->id);
    }

    public function test_status_enum_casts_correctly()
    {
        $task = Task::factory()->create([
            'status' => TaskStatus::IN_PROGRESS,
        ]);

        $this->assertInstanceOf(TaskStatus::class, $task->status);
        $this->assertEquals(TaskStatus::IN_PROGRESS, $task->status);
    }

    public function test_priority_enum_casts_correctly()
    {
        $task = Task::factory()->create([
            'priority' => TaskPriority::URGENT,
        ]);

        $this->assertInstanceOf(TaskPriority::class, $task->priority);
        $this->assertEquals(TaskPriority::URGENT, $task->priority);
    }

    public function test_soft_delete_works()
    {
        $task = Task::factory()->create();
        $taskId = $task->id;
        
        $task->delete();
        
        $this->assertSoftDeleted('tasks', [
            'id' => $taskId,
        ]);
    }

    public function test_permissions_exist()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_tasks']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_tasks']);
        $this->assertDatabaseHas('permissions', ['name' => 'assign_tasks']);
    }

    public function test_task_policy_maps_correctly()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_tasks');
        $user->givePermissionTo('view_tasks');
        $user->givePermissionTo('assign_tasks');
        
        $task = Task::factory()->create();
        
        $this->assertTrue($user->can('create', Task::class));
        $this->assertTrue($user->can('update', $task));
        $this->assertTrue($user->can('delete', $task));
        $this->assertTrue($user->can('view', $task));
        $this->assertTrue($user->can('viewAny', Task::class));
        $this->assertTrue($user->can('assign', $task));
    }
}

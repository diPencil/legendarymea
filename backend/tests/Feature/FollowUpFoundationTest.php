<?php

namespace Tests\Feature;

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

class FollowUpFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_follow_up_can_be_created_as_standalone()
    {
        $creator = User::factory()->create();

        $followUp = FollowUp::create([
            'reference' => 'LM-FUP-2026-000001',
            'title' => 'Standalone Follow-up',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);

        $this->assertDatabaseHas('follow_ups', [
            'id' => $followUp->id,
            'reference' => 'LM-FUP-2026-000001',
            'title' => 'Standalone Follow-up',
        ]);

        $this->assertTrue($followUp->status === FollowUpStatus::PENDING);
        $this->assertNull($followUp->company_id);
    }

    public function test_follow_up_reference_is_unique()
    {
        $creator = User::factory()->create();

        FollowUp::create([
            'reference' => 'LM-FUP-2026-000002',
            'title' => 'Follow-up 1',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessageMatches('/UNIQUE constraint failed|Duplicate entry/');

        FollowUp::create([
            'reference' => 'LM-FUP-2026-000002', // Duplicate reference
            'title' => 'Follow-up 2',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);
    }

    public function test_status_casts_correctly()
    {
        $creator = User::factory()->create();

        $followUp1 = FollowUp::create([
            'reference' => 'LM-FUP-2026-000003',
            'title' => 'Follow-up 1',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);

        $followUp2 = FollowUp::create([
            'reference' => 'LM-FUP-2026-000004',
            'title' => 'Follow-up 2',
            'status' => FollowUpStatus::COMPLETED,
            'follow_up_at' => now()->addDay(),
            'completed_at' => now(),
            'created_by' => $creator->id,
        ]);

        $followUp3 = FollowUp::create([
            'reference' => 'LM-FUP-2026-000005',
            'title' => 'Follow-up 3',
            'status' => FollowUpStatus::CANCELLED,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);

        $this->assertSame(FollowUpStatus::PENDING, $followUp1->refresh()->status);
        $this->assertSame(FollowUpStatus::COMPLETED, $followUp2->refresh()->status);
        $this->assertSame(FollowUpStatus::CANCELLED, $followUp3->refresh()->status);
    }

    public function test_crm_relations_work()
    {
        $creator = User::factory()->create();
        $assignee = Employee::factory()->create();
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $lead = Lead::factory()->create();
        $opportunity = Opportunity::factory()->create();
        $request = Request::factory()->create();
        $task = Task::factory()->create();

        $followUp = FollowUp::create([
            'reference' => 'LM-FUP-2026-000006',
            'title' => 'Linked Follow-up',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
            'assigned_to' => $assignee->id,
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'opportunity_id' => $opportunity->id,
            'request_id' => $request->id,
            'task_id' => $task->id,
        ]);

        $this->assertTrue($followUp->company->is($company));
        $this->assertTrue($followUp->contact->is($contact));
        $this->assertTrue($followUp->lead->is($lead));
        $this->assertTrue($followUp->opportunity->is($opportunity));
        $this->assertTrue($followUp->request->is($request));
        $this->assertTrue($followUp->task->is($task));
        $this->assertTrue($followUp->assignee->is($assignee));
        $this->assertTrue($followUp->creator->is($creator));
    }

    public function test_soft_deletes_works()
    {
        $creator = User::factory()->create();

        $followUp = FollowUp::create([
            'reference' => 'LM-FUP-2026-000007',
            'title' => 'To Delete',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $creator->id,
        ]);

        $followUp->delete();

        $this->assertSoftDeleted('follow_ups', ['id' => $followUp->id]);
    }

    public function test_policy_authorization()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $employee = User::factory()->create();
        $employee->assignRole('employee'); // Has view_follow_ups

        $client = User::factory()->create();
        $client->assignRole('client'); // Does not have follow up permissions

        $followUp = FollowUp::create([
            'reference' => 'LM-FUP-2026-000008',
            'title' => 'Policy Check',
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => now()->addDay(),
            'created_by' => $superAdmin->id,
        ]);

        $this->assertTrue($superAdmin->can('viewAny', FollowUp::class));
        $this->assertTrue($superAdmin->can('create', FollowUp::class));
        
        $this->assertTrue($admin->can('viewAny', FollowUp::class));
        $this->assertTrue($admin->can('create', FollowUp::class));
        $this->assertTrue($admin->can('update', $followUp));
        $this->assertTrue($admin->can('assign', $followUp));
        $this->assertTrue($admin->can('delete', $followUp));

        $this->assertTrue($employee->can('viewAny', FollowUp::class));
        $this->assertTrue($employee->can('view', $followUp));
        $this->assertFalse($employee->can('create', FollowUp::class));
        $this->assertFalse($employee->can('update', $followUp));
        $this->assertFalse($employee->can('delete', $followUp));

        $this->assertFalse($client->can('viewAny', FollowUp::class));
    }

    public function test_factory_generates_valid_reference()
    {
        $followUp = FollowUp::factory()->create();
        
        $this->assertMatchesRegularExpression('/^LM-FUP-\d{4}-\d{6}$/', $followUp->reference);
    }
}

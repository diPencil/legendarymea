<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contact;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Note;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NoteFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'view_notes', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'manage_notes', 'guard_name' => 'web']);
    }

    public function test_note_model_can_persist()
    {
        $note = Note::factory()->create([
            'body' => 'This is a test note.',
            'title' => 'Test Note',
        ]);

        $this->assertDatabaseHas('notes', [
            'id' => $note->id,
            'body' => 'This is a test note.',
            'title' => 'Test Note',
        ]);
        $this->assertNotNull($note->reference);
    }

    public function test_title_may_be_null()
    {
        $note = Note::factory()->create([
            'title' => null,
            'body' => 'Note without title.',
        ]);

        $this->assertDatabaseHas('notes', [
            'id' => $note->id,
            'title' => null,
            'body' => 'Note without title.',
        ]);
    }

    public function test_reference_format_is_correct()
    {
        $note = Note::factory()->create();
        $this->assertStringStartsWith('LM-NTE-' . date('Y') . '-', $note->reference);
        $this->assertEquals(18, strlen($note->reference)); // LM-NTE-YYYY-XXXXXX is 18 chars
    }

    public function test_reference_is_unique()
    {
        $note1 = Note::factory()->create();
        $note2 = Note::factory()->create();
        $this->assertNotEquals($note1->reference, $note2->reference);
    }

    public function test_standalone_note_is_valid()
    {
        $note = Note::factory()->create([
            'company_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'task_id' => null,
            'follow_up_id' => null,
        ]);

        $this->assertDatabaseHas('notes', [
            'id' => $note->id,
            'company_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'task_id' => null,
            'follow_up_id' => null,
        ]);
    }

    public function test_creator_relation_works()
    {
        $user = User::factory()->create();
        $note = Note::factory()->create(['created_by' => $user->id]);

        $this->assertEquals($user->id, $note->creator->id);
    }

    public function test_company_relation_works()
    {
        $company = Company::factory()->create();
        $note = Note::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $note->company->id);
    }

    public function test_contact_relation_works()
    {
        $contact = Contact::factory()->create();
        $note = Note::factory()->create(['contact_id' => $contact->id]);

        $this->assertEquals($contact->id, $note->contact->id);
    }

    public function test_lead_relation_works()
    {
        $lead = Lead::factory()->create();
        $note = Note::factory()->create(['lead_id' => $lead->id]);

        $this->assertEquals($lead->id, $note->lead->id);
    }

    public function test_opportunity_relation_works()
    {
        $opportunity = Opportunity::factory()->create();
        $note = Note::factory()->create(['opportunity_id' => $opportunity->id]);

        $this->assertEquals($opportunity->id, $note->opportunity->id);
    }

    public function test_request_relation_works()
    {
        $request = Request::factory()->create();
        $note = Note::factory()->create(['request_id' => $request->id]);

        $this->assertEquals($request->id, $note->request->id);
    }

    public function test_task_relation_works()
    {
        $task = Task::factory()->create();
        $note = Note::factory()->create(['task_id' => $task->id]);

        $this->assertEquals($task->id, $note->task->id);
    }

    public function test_follow_up_relation_works()
    {
        $followUp = FollowUp::factory()->create();
        $note = Note::factory()->create(['follow_up_id' => $followUp->id]);

        $this->assertEquals($followUp->id, $note->followUp->id);
    }

    public function test_soft_delete_works()
    {
        $note = Note::factory()->create();
        $note->delete();

        $this->assertSoftDeleted($note);
    }

    public function test_view_notes_permission_exists()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_notes']);
    }

    public function test_manage_notes_permission_exists()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'manage_notes']);
    }

    public function test_note_policy_permission_mapping_works()
    {
        $userWithView = User::factory()->create();
        $userWithView->givePermissionTo('view_notes');

        $userWithManage = User::factory()->create();
        $userWithManage->givePermissionTo('manage_notes');

        $userWithout = User::factory()->create();

        $policy = new \App\Policies\NotePolicy();
        $note = Note::factory()->create();

        $this->assertTrue($policy->viewAny($userWithView));
        $this->assertTrue($policy->viewAny($userWithManage));
        $this->assertFalse($policy->viewAny($userWithout));

        $this->assertTrue($policy->view($userWithView, $note));
        $this->assertTrue($policy->view($userWithManage, $note));
        $this->assertFalse($policy->view($userWithout, $note));

        $this->assertFalse($policy->create($userWithView));
        $this->assertTrue($policy->create($userWithManage));
        $this->assertFalse($policy->create($userWithout));

        $this->assertFalse($policy->update($userWithView, $note));
        $this->assertTrue($policy->update($userWithManage, $note));
        $this->assertFalse($policy->update($userWithout, $note));

        $this->assertFalse($policy->delete($userWithView, $note));
        $this->assertTrue($policy->delete($userWithManage, $note));
        $this->assertFalse($policy->delete($userWithout, $note));
    }
}

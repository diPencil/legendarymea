<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Note;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DocumentFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_document_persists_and_reference_format()
    {
        $document = Document::factory()->create();

        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'reference' => $document->reference,
        ]);

        $this->assertMatchesRegularExpression('/^LM-DOC-\d{4}-\d{6}$/', $document->reference);
    }

    public function test_document_reference_must_be_unique()
    {
        $document1 = Document::factory()->create(['reference' => 'LM-DOC-2026-000001']);
        
        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessageMatches('/Unique violation|Duplicate entry/');
        
        Document::factory()->create(['reference' => 'LM-DOC-2026-000001']);
    }

    public function test_creator_relation_works()
    {
        $user = User::factory()->create();
        $document = Document::factory()->create(['created_by' => $user->id]);

        $this->assertInstanceOf(User::class, $document->creator);
        $this->assertEquals($user->id, $document->creator->id);
    }

    public function test_title_can_be_nullable_and_metadata_persists()
    {
        $document = Document::factory()->create([
            'title' => null,
            'description' => 'A test description',
            'original_name' => 'test_file.pdf',
            'file_path' => 'private/documents/test_file.pdf',
            'disk' => 'private',
            'mime_type' => 'application/pdf',
            'size' => 2048,
        ]);

        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'title' => null,
            'description' => 'A test description',
            'original_name' => 'test_file.pdf',
            'file_path' => 'private/documents/test_file.pdf',
            'disk' => 'private',
            'mime_type' => 'application/pdf',
            'size' => 2048,
        ]);
    }

    public function test_standalone_document_is_valid()
    {
        $document = Document::factory()->create([
            'company_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'task_id' => null,
            'follow_up_id' => null,
            'note_id' => null,
        ]);

        $this->assertNotNull($document->id);
    }

    public function test_business_relationships()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create();
        $lead = Lead::factory()->create();
        $opportunity = Opportunity::factory()->create();
        $request = Request::factory()->create();
        $task = Task::factory()->create();
        $followUp = FollowUp::factory()->create();
        $note = Note::factory()->create();

        $document = Document::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'lead_id' => $lead->id,
            'opportunity_id' => $opportunity->id,
            'request_id' => $request->id,
            'task_id' => $task->id,
            'follow_up_id' => $followUp->id,
            'note_id' => $note->id,
        ]);

        $this->assertEquals($company->id, $document->company->id);
        $this->assertEquals($contact->id, $document->contact->id);
        $this->assertEquals($lead->id, $document->lead->id);
        $this->assertEquals($opportunity->id, $document->opportunity->id);
        $this->assertEquals($request->id, $document->request->id);
        $this->assertEquals($task->id, $document->task->id);
        $this->assertEquals($followUp->id, $document->followUp->id);
        $this->assertEquals($note->id, $document->note->id);
    }

    public function test_document_soft_deletes()
    {
        $document = Document::factory()->create();
        $documentId = $document->id;

        $document->delete();

        $this->assertSoftDeleted('documents', [
            'id' => $documentId,
        ]);
    }

    public function test_permissions_exist()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'view_documents', 'guard_name' => 'web']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_documents', 'guard_name' => 'web']);
    }

    public function test_document_policy_mapping()
    {
        $userWithView = User::factory()->create();
        $userWithView->givePermissionTo('view_documents');

        $userWithManage = User::factory()->create();
        $userWithManage->givePermissionTo('manage_documents');

        $userWithout = User::factory()->create();

        $document = Document::factory()->create();

        // View Any
        $this->assertTrue(Gate::forUser($userWithView)->check('viewAny', Document::class));
        $this->assertFalse(Gate::forUser($userWithout)->check('viewAny', Document::class));

        // View
        $this->assertTrue(Gate::forUser($userWithView)->check('view', $document));
        $this->assertFalse(Gate::forUser($userWithout)->check('view', $document));

        // Create
        $this->assertTrue(Gate::forUser($userWithManage)->check('create', Document::class));
        $this->assertFalse(Gate::forUser($userWithout)->check('create', Document::class));

        // Update
        $this->assertTrue(Gate::forUser($userWithManage)->check('update', $document));
        $this->assertFalse(Gate::forUser($userWithout)->check('update', $document));

        // Delete
        $this->assertTrue(Gate::forUser($userWithManage)->check('delete', $document));
        $this->assertFalse(Gate::forUser($userWithout)->check('delete', $document));
    }
}

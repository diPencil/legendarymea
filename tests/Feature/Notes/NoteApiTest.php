<?php

namespace Tests\Feature\Notes;

use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class NoteApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'view_notes', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'manage_notes', 'guard_name' => 'web']);
    }

    public function test_unauthenticated_blocked()
    {
        $this->getJson('/api/v1/notes')->assertUnauthorized();
    }

    public function test_view_notes_can_list_and_show()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_notes');
        $note = Note::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/notes')->assertOk();
        $this->actingAs($user)->getJson("/api/v1/notes/{$note->id}")->assertOk();
    }

    public function test_view_notes_cannot_create_update_delete()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_notes');
        $note = Note::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/notes', ['body' => 'Test'])->assertForbidden();
        $this->actingAs($user)->putJson("/api/v1/notes/{$note->id}", ['body' => 'Test'])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/notes/{$note->id}")->assertForbidden();
    }

    public function test_manage_notes_can_create()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');

        $response = $this->actingAs($user)->postJson('/api/v1/notes', [
            'body' => 'This is a new standalone note.',
        ]);

        $response->assertCreated();
        $data = $response->json('data');
        $this->assertEquals('This is a new standalone note.', $data['body']);
        $this->assertNull($data['title']);
        $this->assertEquals($user->id, $data['creator']['id']);
        $this->assertNotNull($data['reference']);
    }

    public function test_create_validates_relationships_and_company_integrity()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');

        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contactCompany2 = Contact::factory()->create(['company_id' => $company2->id]);

        $response = $this->actingAs($user)->postJson('/api/v1/notes', [
            'body' => 'Test integrity',
            'company_id' => $company1->id,
            'contact_id' => $contactCompany2->id,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['contact_id']);
    }

    public function test_update_body_and_title_and_explicit_null_clear()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');

        $company = Company::factory()->create();
        $note = Note::factory()->create([
            'title' => 'Initial Title',
            'body' => 'Initial Body',
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($user)->patchJson("/api/v1/notes/{$note->id}", [
            'title' => null, // Explicit clear
            'body' => 'Updated Body',
            // company_id absent, should be preserved
        ]);

        $response->assertOk();
        $data = $response->json('data');
        $this->assertNull($data['title']);
        $this->assertEquals('Updated Body', $data['body']);
        $this->assertEquals($company->id, $data['company']['id']); // Preserved
    }

    public function test_update_cannot_change_creator_or_reference()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');

        $creator = User::factory()->create();
        $note = Note::factory()->create(['created_by' => $creator->id]);
        $originalReference = $note->reference;

        $response = $this->actingAs($user)->patchJson("/api/v1/notes/{$note->id}", [
            'body' => 'Hacking creator',
            'created_by' => $user->id,
            'reference' => 'LM-NTE-9999-000000',
        ]);

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals($creator->id, $data['creator']['id']);
        $this->assertEquals($originalReference, $data['reference']);
    }

    public function test_delete_soft_deletes_and_not_returned_in_list()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');

        $note = Note::factory()->create();

        $this->actingAs($user)->deleteJson("/api/v1/notes/{$note->id}")->assertOk();

        $this->assertSoftDeleted($note);
        $this->actingAs($user)->getJson("/api/v1/notes/{$note->id}")->assertNotFound();
    }

    public function test_audit_log_and_crm_activity_on_create_update_delete()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_notes');
        
        $company = Company::factory()->create();

        // CREATE
        $response = $this->actingAs($user)->postJson('/api/v1/notes', [
            'body' => 'Audit test',
            'company_id' => $company->id,
        ]);
        $noteId = $response->json('data.id');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'note.created',
            'subject_id' => $noteId,
        ]);
        $this->assertDatabaseHas('crm_activities', [
            'type' => 'note.created',
            'subject_id' => $noteId,
            'company_id' => $company->id,
        ]);

        // UPDATE
        $this->actingAs($user)->patchJson("/api/v1/notes/{$noteId}", [
            'body' => 'Audit test updated',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'note.updated',
            'subject_id' => $noteId,
        ]);
        $this->assertDatabaseHas('crm_activities', [
            'type' => 'note.updated',
            'subject_id' => $noteId,
            'company_id' => $company->id,
        ]);

        // DELETE
        $this->actingAs($user)->deleteJson("/api/v1/notes/{$noteId}");
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'note.deleted',
            'subject_id' => $noteId,
        ]);
        $this->assertDatabaseHas('crm_activities', [
            'type' => 'note.deleted',
            'subject_id' => $noteId,
            'company_id' => $company->id,
        ]);
    }

    public function test_list_pagination_and_search()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_notes');

        Note::factory()->create(['title' => 'FindMe 123']);
        Note::factory()->create(['body' => 'Hidden 123 here']);
        Note::factory()->create(['title' => 'Other Note']);

        $response = $this->actingAs($user)->getJson('/api/v1/notes?search=123');
        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }
}

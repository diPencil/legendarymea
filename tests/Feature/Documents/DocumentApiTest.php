<?php

namespace Tests\Feature\Documents;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        Storage::fake('local');
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/documents')->assertUnauthorized();
        $this->postJson('/api/v1/documents', [])->assertUnauthorized();
        $this->getJson('/api/v1/documents/1')->assertUnauthorized();
        $this->putJson('/api/v1/documents/1', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/documents/1')->assertUnauthorized();
        $this->getJson('/api/v1/documents/1/download')->assertUnauthorized();
    }

    public function test_permission_required_for_list_and_show()
    {
        $user = User::factory()->create(); // No permissions
        
        $document = Document::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/documents')->assertForbidden();
        $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id)->assertForbidden();
        $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id . '/download')->assertForbidden();
        $dummyFile = UploadedFile::fake()->create('dummy.pdf', 10, 'application/pdf');
        $this->actingAs($user)->postJson('/api/v1/documents', ['file' => $dummyFile])->assertForbidden();
        $this->actingAs($user)->putJson('/api/v1/documents/' . $document->id, [])->assertForbidden();
        $this->actingAs($user)->deleteJson('/api/v1/documents/' . $document->id)->assertForbidden();
    }

    public function test_view_documents_can_list_show_download()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_documents');
        
        $document = Document::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/documents')->assertOk();
        $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id)->assertOk();
        
        // Setup fake file
        UploadedFile::fake()->create($document->original_name, 10)->storeAs(dirname($document->file_path), basename($document->file_path), 'local');
        $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id . '/download')->assertOk();

        $dummyFile = UploadedFile::fake()->create('dummy.pdf', 10, 'application/pdf');

        $this->actingAs($user)->postJson('/api/v1/documents', ['file' => $dummyFile])->assertForbidden();
        $this->actingAs($user)->putJson('/api/v1/documents/' . $document->id, [])->assertForbidden();
        $this->actingAs($user)->deleteJson('/api/v1/documents/' . $document->id)->assertForbidden();
    }

    public function test_list_supports_pagination_search_filters_and_sorting()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_documents');

        Document::factory()->count(20)->create();
        Document::factory()->create(['title' => 'Specific Search Title']);

        $response = $this->actingAs($user)->getJson('/api/v1/documents?search=Specific Search Title');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));

        $response = $this->actingAs($user)->getJson('/api/v1/documents?per_page=15');
        $response->assertOk();
        $this->assertCount(15, $response->json('data'));
    }

    public function test_valid_private_file_upload_succeeds()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');
        $user->givePermissionTo('view_documents'); // for response resource loading

        $file = UploadedFile::fake()->create('contract.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/api/v1/documents', [
            'file' => $file,
            'title' => 'New Contract',
            'description' => 'A very important contract',
        ]);

        $response->assertCreated();
        
        $documentId = $response->json('data.id');
        $this->assertDatabaseHas('documents', [
            'id' => $documentId,
            'title' => 'New Contract',
            'original_name' => 'contract.pdf',
            'created_by' => $user->id,
        ]);

        $document = Document::find($documentId);
        $this->assertTrue(Storage::disk('local')->exists($document->file_path));
        
        // ensure internal path is NOT exposed
        $this->assertArrayNotHasKey('file_path', $response->json('data'));
        $this->assertArrayNotHasKey('disk', $response->json('data'));
    }

    public function test_oversize_file_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');

        $file = UploadedFile::fake()->create('contract.pdf', 15000, 'application/pdf'); // > 10MB

        $response = $this->actingAs($user)->postJson('/api/v1/documents', [
            'file' => $file,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_disallowed_executable_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');

        $file = UploadedFile::fake()->create('script.sh', 10, 'text/x-shellscript');

        $response = $this->actingAs($user)->postJson('/api/v1/documents', [
            'file' => $file,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_company_contact_mismatch_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');
        $user->givePermissionTo('view_documents');

        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company2->id]);

        $file = UploadedFile::fake()->create('test.pdf', 10, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/api/v1/documents', [
            'file' => $file,
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['contact_id']);
    }

    public function test_update_editable_fields_and_nullable_clearing()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');
        $user->givePermissionTo('view_documents');

        $company = Company::factory()->create();
        $document = Document::factory()->create([
            'title' => 'Old Title',
            'company_id' => $company->id
        ]);

        $response = $this->actingAs($user)->putJson('/api/v1/documents/' . $document->id, [
            'title' => 'New Title',
            'company_id' => null, // Explicit null
        ]);

        $response->assertOk();
        
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'title' => 'New Title',
            'company_id' => null,
        ]);
        
        // Binary file cannot be replaced
        $file = UploadedFile::fake()->create('test2.pdf', 10, 'application/pdf');
        $response2 = $this->actingAs($user)->putJson('/api/v1/documents/' . $document->id, [
            'file' => $file,
        ]);
        
        $response2->assertOk(); // it ignores the file field
        $document->refresh();
        $this->assertNotEquals('test2.pdf', $document->original_name);
    }

    public function test_update_company_change_must_preserve_existing_contact_consistency()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');
        $user->givePermissionTo('view_documents');

        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company1->id]);

        $document = Document::factory()->create([
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ]);

        // Change company_id to company2, contact_id is not provided so it remains in DB, but the service should clear it.
        $response = $this->actingAs($user)->putJson('/api/v1/documents/' . $document->id, [
            'company_id' => $company2->id,
        ]);

        $response->assertOk();
        
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'company_id' => $company2->id,
            'contact_id' => null, // Cleared because it doesn't match company2
        ]);
    }

    public function test_delete_soft_deletes_and_retains_physical_file()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_documents');
        $user->givePermissionTo('view_documents');

        $document = Document::factory()->create();
        
        UploadedFile::fake()->create($document->original_name, 10)->storeAs(dirname($document->file_path), basename($document->file_path), 'local');

        $response = $this->actingAs($user)->deleteJson('/api/v1/documents/' . $document->id);
        $response->assertNoContent();

        $this->assertSoftDeleted('documents', [
            'id' => $document->id,
        ]);

        // File is retained
        $this->assertTrue(Storage::disk('local')->exists($document->file_path));
        
        // Cannot download deleted file
        $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id . '/download')->assertNotFound();
    }

    public function test_missing_physical_file_handled_cleanly()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_documents');

        $document = Document::factory()->create();
        
        // Physical file does NOT exist on disk

        $response = $this->actingAs($user)->getJson('/api/v1/documents/' . $document->id . '/download');
        $response->assertNotFound();
        $response->assertJson(['message' => 'File not found on server.']);
    }
}

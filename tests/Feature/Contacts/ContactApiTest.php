<?php

namespace Tests\Feature\Contacts;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Contact;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class ContactApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->role = Role::firstOrCreate(['name' => 'Manager']);
        $this->role->givePermissionTo(Permission::firstOrCreate(['name' => 'manage_contacts']));
        $this->role->givePermissionTo(Permission::firstOrCreate(['name' => 'view_contacts']));
        $this->role->givePermissionTo(Permission::firstOrCreate(['name' => 'manage_companies']));
        $this->role->givePermissionTo(Permission::firstOrCreate(['name' => 'view_companies']));
    }

    private function getAuthorizedUser()
    {
        $user = User::factory()->create();
        $user->assignRole($this->role);
        return $user;
    }

    public function test_auth_required()
    {
        $response = $this->getJson('/api/v1/contacts');
        $response->assertStatus(401);
    }

    public function test_authorized_contact_list()
    {
        $user = $this->getAuthorizedUser();
        Contact::factory()->count(3)->create();
        
        $response = $this->actingAs($user)->getJson('/api/v1/contacts');
        
        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
    }

    public function test_create_contact_without_company()
    {
        $user = $this->getAuthorizedUser();
        
        $response = $this->actingAs($user)->postJson('/api/v1/contacts', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => ' John.Doe@Example.com ', // Test normalization
        ]);
        
        $response->assertStatus(201);
        $this->assertEquals('john.doe@example.com', $response->json('data.email'));
        $this->assertNotNull($response->json('data.reference'));
        $this->assertStringStartsWith('LM-CNT-', $response->json('data.reference'));
    }

    public function test_create_contact_with_company()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        
        $response = $this->actingAs($user)->postJson('/api/v1/contacts', [
            'company_id' => $company->id,
            'first_name' => 'Jane',
        ]);
        
        $response->assertStatus(201);
        $this->assertEquals($company->id, $response->json('data.company_id'));
    }

    public function test_show_contact()
    {
        $user = $this->getAuthorizedUser();
        $contact = Contact::factory()->create();
        
        $response = $this->actingAs($user)->getJson('/api/v1/contacts/' . $contact->id);
        
        $response->assertStatus(200);
        $this->assertEquals($contact->id, $response->json('data.id'));
    }

    public function test_update_contact()
    {
        $user = $this->getAuthorizedUser();
        $contact = Contact::factory()->create(['first_name' => 'Old Name']);
        
        $response = $this->actingAs($user)->patchJson('/api/v1/contacts/' . $contact->id, [
            'first_name' => 'New Name',
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals('New Name', $response->json('data.first_name'));
    }

    public function test_move_contact_to_another_company()
    {
        $user = $this->getAuthorizedUser();
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        
        $contact = Contact::factory()->create(['company_id' => $company1->id]);
        
        $response = $this->actingAs($user)->patchJson('/api/v1/contacts/' . $contact->id, [
            'company_id' => $company2->id,
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals($company2->id, $response->json('data.company_id'));
    }

    public function test_soft_delete_and_company_survives()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        
        $response = $this->actingAs($user)->deleteJson('/api/v1/contacts/' . $contact->id);
        
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('contacts', ['id' => $contact->id]);
        $this->assertDatabaseHas('companies', ['id' => $company->id]);
    }

    public function test_primary_contact_flow()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        
        // 1. Create primary contact
        $response1 = $this->actingAs($user)->postJson('/api/v1/contacts', [
            'company_id' => $company->id,
            'first_name' => 'Primary 1',
            'is_primary' => true,
        ]);
        $response1->assertStatus(201);
        $contact1Id = $response1->json('data.id');
        $this->assertTrue($response1->json('data.is_primary'));

        // 2. Set another contact primary
        $contact2 = Contact::factory()->create(['company_id' => $company->id]);
        $response2 = $this->actingAs($user)->postJson("/api/v1/companies/{$company->id}/primary-contact", [
            'contact_id' => $contact2->id,
        ]);
        $response2->assertStatus(200);
        $this->assertTrue($response2->json('data.is_primary'));
        
        // 3. Verify previous primary becomes false
        $this->assertDatabaseHas('contacts', ['id' => $contact1Id, 'is_primary' => false]);
    }

    public function test_set_primary_rejects_contact_from_wrong_company()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $otherCompany->id]);

        $response = $this->actingAs($user)->postJson("/api/v1/companies/{$company->id}/primary-contact", [
            'contact_id' => $contact->id,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'company_id' => $otherCompany->id,
            'is_primary' => false,
        ]);
    }

    public function test_company_show_returns_real_contacts_count_and_primary_contact()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        $primary = Contact::factory()->create([
            'company_id' => $company->id,
            'first_name' => 'Primary',
            'is_primary' => true,
        ]);
        Contact::factory()->create(['company_id' => $company->id]);
        Contact::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/v1/companies/{$company->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.contacts_count', 2)
            ->assertJsonPath('data.primary_contact.id', $primary->id)
            ->assertJsonPath('data.primary_contact.first_name', 'Primary');
    }

    public function test_update_contact_can_detach_from_company_and_clear_nullable_fields()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        $contact = Contact::factory()->create([
            'company_id' => $company->id,
            'last_name' => 'Clear',
            'job_title' => 'Director',
            'department' => 'Sales',
            'email' => 'clear@example.com',
            'phone' => '+201111111111',
            'country_code' => 'EG',
            'status' => 'active',
            'preferred_locale' => 'ar',
            'is_primary' => true,
            'notes' => 'Remove me',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/v1/contacts/{$contact->id}", [
            'company_id' => null,
            'last_name' => null,
            'job_title' => null,
            'department' => null,
            'email' => null,
            'phone' => null,
            'country_code' => null,
            'status' => null,
            'preferred_locale' => null,
            'is_primary' => false,
            'notes' => null,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.company_id', null)
            ->assertJsonPath('data.last_name', null)
            ->assertJsonPath('data.job_title', null)
            ->assertJsonPath('data.department', null)
            ->assertJsonPath('data.email', null)
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('data.country_code', null)
            ->assertJsonPath('data.status', null)
            ->assertJsonPath('data.preferred_locale', null)
            ->assertJsonPath('data.is_primary', false)
            ->assertJsonPath('data.notes', null);

        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'company_id' => null,
            'last_name' => null,
            'job_title' => null,
            'department' => null,
            'email' => null,
            'phone' => null,
            'country_code' => null,
            'status' => null,
            'preferred_locale' => null,
            'is_primary' => false,
            'notes' => null,
        ]);
    }

    public function test_duplicate_contact_email_remains_allowed()
    {
        $user = $this->getAuthorizedUser();

        $first = $this->actingAs($user)->postJson('/api/v1/contacts', [
            'first_name' => 'First',
            'email' => 'shared@example.com',
        ]);
        $second = $this->actingAs($user)->postJson('/api/v1/contacts', [
            'first_name' => 'Second',
            'email' => 'shared@example.com',
        ]);

        $first->assertStatus(201);
        $second->assertStatus(201);
        $this->assertDatabaseCount('contacts', 2);
        $this->assertSame(2, Contact::where('email', 'shared@example.com')->count());
    }

    public function test_company_contacts_endpoint()
    {
        $user = $this->getAuthorizedUser();
        $company = Company::factory()->create();
        Contact::factory()->count(2)->create(['company_id' => $company->id]);
        Contact::factory()->count(3)->create(); // other contacts
        
        $response = $this->actingAs($user)->getJson("/api/v1/companies/{$company->id}/contacts");
        
        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
    }
}

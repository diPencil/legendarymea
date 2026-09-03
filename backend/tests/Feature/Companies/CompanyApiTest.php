<?php

namespace Tests\Feature\Companies;

use App\Models\User;
use App\Models\Company;
use App\Models\Employee;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::firstOrCreate(['name' => 'view_companies']);
        Permission::firstOrCreate(['name' => 'manage_companies']);

        $this->managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $this->managerRole->givePermissionTo(['view_companies', 'manage_companies']);
        
        $this->viewerRole = Role::firstOrCreate(['name' => 'Viewer']);
        $this->viewerRole->givePermissionTo(['view_companies']);
        
        $this->unauthorizedRole = Role::firstOrCreate(['name' => 'Unauthorized']);
    }

    public function test_can_list_companies()
    {
        $user = User::factory()->create();
        $user->assignRole($this->managerRole);

        Company::factory()->count(3)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/companies');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }

    public function test_can_create_company()
    {
        $user = User::factory()->create();
        $user->assignRole($this->managerRole);

        $response = $this->actingAs($user)->postJson('/api/v1/companies', [
            'name' => 'Test Company',
            'relationship_types' => ['client', 'partner']
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'Test Company');

        $this->assertDatabaseHas('companies', ['name' => 'Test Company']);
        
        $company = Company::where('name', 'Test Company')->first();
        $this->assertEquals(2, $company->companyRelationships()->count());
        $this->assertDatabaseHas('crm_activities', [
            'company_id' => $company->id,
            'type' => 'company.created'
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'subject_id' => $company->id,
            'action' => 'company.created'
        ]);
    }

    public function test_can_update_company()
    {
        $user = User::factory()->create();
        $user->assignRole($this->managerRole);

        $company = Company::factory()->create(['name' => 'Old Name']);
        $company->companyRelationships()->create(['type' => 'lead']);

        $response = $this->actingAs($user)->putJson("/api/v1/companies/{$company->id}", [
            'name' => 'New Name',
            'relationship_types' => ['client'] // lead removed, client added
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('companies', ['id' => $company->id, 'name' => 'New Name']);
        
        $this->assertDatabaseMissing('company_relationships', [
            'company_id' => $company->id,
            'type' => 'lead'
        ]);
        
        $this->assertDatabaseHas('company_relationships', [
            'company_id' => $company->id,
            'type' => 'client'
        ]);
        
        $this->assertDatabaseHas('crm_activities', [
            'company_id' => $company->id,
            'type' => 'company.relationship_removed'
        ]);
        
        $this->assertDatabaseHas('crm_activities', [
            'company_id' => $company->id,
            'type' => 'company.relationship_added'
        ]);
    }

    public function test_can_assign_account_manager()
    {
        $user = User::factory()->create();
        $user->assignRole($this->managerRole);

        $employeeUser = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $employeeUser->id, 'status' => 'active']);
        $company = Company::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/v1/companies/{$company->id}/account-manager", [
            'account_manager_id' => $employee->id
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('companies', [
            'id' => $company->id,
            'account_manager_id' => $employee->id
        ]);
        
        $this->assertDatabaseHas('crm_activities', [
            'company_id' => $company->id,
            'type' => 'company.account_manager_changed'
        ]);
    }

    public function test_cannot_delete_company_without_permission()
    {
        $user = User::factory()->create();
        $user->assignRole($this->viewerRole); // Only view permission

        $company = Company::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/v1/companies/{$company->id}");

        $response->assertStatus(403);
    }

    public function test_can_delete_company_with_permission()
    {
        $user = User::factory()->create();
        $user->assignRole($this->managerRole);

        $company = Company::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/v1/companies/{$company->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('companies', ['id' => $company->id]);
    }
}

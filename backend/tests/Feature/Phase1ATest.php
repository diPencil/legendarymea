<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Company;
use App\Models\Contact;
use App\Models\CompanyRelationship;

class Phase1ATest extends TestCase
{
    use RefreshDatabase;

    public function test_employees_route_returns_list()
    {
        $user = User::factory()->create();
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Manager']);
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'manage_employees']);
        $role->givePermissionTo($permission);
        $user->assignRole($role);
        
        $response = $this->actingAs($user)->getJson('/api/v1/employees');
        $response->assertStatus(200);
    }

    public function test_companies_route_returns_list()
    {
        $user = User::factory()->create();
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Manager']);
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'view_companies']);
        $role->givePermissionTo($permission);
        $user->assignRole($role);

        $response = $this->actingAs($user)->getJson('/api/v1/companies');
        $response->assertStatus(200);
    }

    public function test_contacts_route_returns_list()
    {
        $user = User::factory()->create();
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Manager']);
        $role->givePermissionTo(\Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'view_contacts']));
        $user->assignRole($role);
        $response = $this->actingAs($user)->getJson('/api/v1/contacts');
        $response->assertStatus(200);
    }

    public function test_company_relationships_normalization()
    {
        $user = User::factory()->create();
        
        $company = Company::factory()->create();
        CompanyRelationship::create([
            'company_id' => $company->id,
            'type' => 'client'
        ]);

        CompanyRelationship::create([
            'company_id' => $company->id,
            'type' => 'partner'
        ]);

        $this->assertEquals(2, CompanyRelationship::where('company_id', $company->id)->count());
    }

    public function test_company_account_manager()
    {
        $user = User::factory()->create();
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Manager']);
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'manage_companies']);
        $role->givePermissionTo($permission);
        $user->assignRole($role);

        $company = Company::factory()->create();
        $employee = Employee::factory()->create(['status' => 'active']);

        $response = $this->actingAs($user)->postJson('/api/v1/companies/'.$company->id.'/account-manager', [
            'account_manager_id' => $employee->id
        ]);

        $response->assertStatus(200);
        $this->assertEquals($employee->id, Company::find($company->id)->account_manager_id);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AccessMatrixEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_role_permission_matrix_changes_are_immediately_enforced_for_employee_company_crud(): void
    {
        $matrixAdmin = User::factory()->create();
        $matrixAdmin->givePermissionTo('manage_roles_permissions');

        $employeeRole = Role::findByName('employee', 'web');
        $employee = User::factory()->create();
        $employee->assignRole($employeeRole);

        Company::factory()->create();

        $this->actingAs($matrixAdmin)
            ->putJson("/api/v1/roles-permissions/{$employeeRole->id}", [
                'permissions' => ['view_dashboard'],
            ])
            ->assertOk();

        $this->actingAs($employee)->getJson('/api/v1/companies')->assertForbidden();
        $this->actingAs($employee)->postJson('/api/v1/companies', ['name' => 'Denied Company'])->assertForbidden();

        $this->actingAs($matrixAdmin)
            ->putJson("/api/v1/roles-permissions/{$employeeRole->id}", [
                'permissions' => [
                    'view_dashboard',
                    'view_companies',
                    'create_companies',
                    'update_companies',
                    'delete_companies',
                ],
            ])
            ->assertOk();

        $this->actingAs($employee)->getJson('/api/v1/companies')->assertOk();

        $companyId = $this->actingAs($employee)
            ->postJson('/api/v1/companies', ['name' => 'Matrix Company', 'relationship_types' => ['client']])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($employee)
            ->putJson("/api/v1/companies/{$companyId}", ['name' => 'Matrix Company Updated', 'relationship_types' => ['client']])
            ->assertOk();

        $this->actingAs($employee)
            ->deleteJson("/api/v1/companies/{$companyId}")
            ->assertOk();
    }

    public function test_employee_sensitive_data_requires_update_employee_permission(): void
    {
        $target = Employee::factory()->create([
            'bank_account_number' => 'SA123456789',
            'national_address' => 'Private national address',
        ]);

        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_employees');

        $this->actingAs($viewer)
            ->getJson("/api/v1/employees/{$target->id}?include_sensitive=1")
            ->assertOk()
            ->assertJsonMissingPath('data.bank_account_number')
            ->assertJsonMissingPath('data.national_address');

        $manager = User::factory()->create();
        $manager->givePermissionTo('view_employees', 'update_employees');

        $this->actingAs($manager)
            ->getJson("/api/v1/employees/{$target->id}?include_sensitive=1")
            ->assertOk()
            ->assertJsonPath('data.bank_account_number', 'SA123456789')
            ->assertJsonPath('data.national_address', 'Private national address');
    }

    public function test_sensitive_finance_and_settings_permissions_are_backend_enforced(): void
    {
        $employee = User::factory()->create();
        $employee->assignRole('employee');

        $this->actingAs($employee)->getJson('/api/v1/finance-reports/overview')->assertForbidden();
        $this->actingAs($employee)
            ->putJson('/api/v1/settings/general', ['settings' => ['company_display_name' => 'Denied']])
            ->assertForbidden();

        $employee->givePermissionTo('view_finance_reports', 'view_settings', 'update_settings');

        $this->actingAs($employee)->getJson('/api/v1/finance-reports/overview')->assertOk();
        $this->actingAs($employee)
            ->putJson('/api/v1/settings/general', ['settings' => ['company_display_name' => 'Allowed']])
            ->assertOk();
    }

    public function test_super_admin_keeps_full_access_and_client_role_is_isolated_from_internal_permissions(): void
    {
        $company = Company::factory()->create();

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $this->actingAs($superAdmin)->getJson('/api/v1/companies')->assertOk();
        $this->actingAs($superAdmin)->deleteJson("/api/v1/companies/{$company->id}")->assertOk();

        $client = User::factory()->create();
        $client->assignRole('client');
        $client->givePermissionTo('view_companies', 'create_companies', 'view_finance_reports', 'update_settings');

        $this->actingAs($client)->getJson('/api/v1/companies')->assertForbidden();
        $this->actingAs($client)->postJson('/api/v1/companies', ['name' => 'Client Escape'])->assertForbidden();
        $this->actingAs($client)->getJson('/api/v1/finance-reports/overview')->assertForbidden();
        $this->actingAs($client)
            ->putJson('/api/v1/settings/general', ['settings' => ['company_display_name' => 'Client Escape']])
            ->assertForbidden();
    }
}

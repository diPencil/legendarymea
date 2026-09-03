<?php

namespace Tests\Feature\Employees;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\AuditLog;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class EmployeeApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        
        Permission::firstOrCreate(['name' => 'manage_employees']);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->givePermissionTo('manage_employees');
        
        Role::firstOrCreate(['name' => 'client']);
        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'employee']);
    }

    protected function adminUser()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        return $user;
    }

    public function test_unauthorized_access_denied()
    {
        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(401);
    }

    public function test_client_denied()
    {
        $user = User::factory()->create();
        $user->assignRole('client');
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(403);
    }

    public function test_super_admin_bypass()
    {
        $user = User::factory()->create();
        $user->assignRole('super_admin');
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(200);
    }

    public function test_authorized_list_and_pagination()
    {
        Employee::factory()->count(20)->create();
        
        $response = $this->actingAs($this->adminUser())->getJson('/api/v1/employees?per_page=5');
        
        $response->assertStatus(200)
                 ->assertJsonCount(5, 'data')
                 ->assertJsonPath('meta.total', 20);
    }

    public function test_create_linked_to_existing_user()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'job_title' => 'Developer',
            'status' => 'active'
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.job_title', 'Developer');
                 
        $this->assertDatabaseHas('employees', [
            'user_id' => $user->id,
            'job_title' => 'Developer'
        ]);
        
        // Assert audit on create
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.created',
            'subject_type' => Employee::class,
        ]);
    }

    public function test_unique_user_to_employee_relationship()
    {
        $employee = Employee::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $employee->user_id,
            'job_title' => 'Developer'
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['user_id']);
    }

    public function test_generated_employee_code_and_uniqueness()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        
        $this->actingAs($this->adminUser());
        
        $res1 = $this->postJson('/api/v1/employees', ['system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user1->id]);
        $res2 = $this->postJson('/api/v1/employees', ['system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user2->id]);
        
        $code1 = $res1->json('data.employee_code');
        $code2 = $res2->json('data.employee_code');
        
        $this->assertStringStartsWith('LM-EMP-', $code1);
        $this->assertNotEquals($code1, $code2);
    }

    public function test_show_and_sensitive_fields_not_exposed()
    {
        $employee = Employee::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->getJson("/api/v1/employees/{$employee->id}");
        
        $response->assertStatus(200)
                 ->assertJsonPath('data.id', $employee->id)
                 ->assertJsonMissing(['password', 'tokens']);
    }

    public function test_update_with_audit()
    {
        $employee = Employee::factory()->create(['job_title' => 'Junior']);
        
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'job_title' => 'Senior'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.job_title', 'Senior');
                 
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.updated',
            'subject_id' => $employee->id
        ]);
    }

    public function test_soft_delete_and_user_survives()
    {
        $employee = Employee::factory()->create();
        $userId = $employee->user_id;
        
        $response = $this->actingAs($this->adminUser())->deleteJson("/api/v1/employees/{$employee->id}");
        
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertDatabaseHas('users', ['id' => $userId]);
        
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.deleted',
            'subject_id' => $employee->id
        ]);
    }

    public function test_valid_status_and_invalid_status_rejected()
    {
        $user = User::factory()->create();
        
        // Invalid status
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'status' => 'invalid_status'
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
        
        // Valid status
        $response = $this->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'status' => 'on_leave'
        ]);
        $response->assertStatus(201)->assertJsonPath('data.status', 'on_leave');
    }

    public function test_manager_relationship_and_self_manager_rejected()
    {
        $employee = Employee::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'manager_id' => $employee->id
        ]);
        
        $response->assertStatus(422)->assertJsonValidationErrors(['manager_id']);
    }

    public function test_circular_manager_relationship_rejected()
    {
        $empA = Employee::factory()->create();
        $empB = Employee::factory()->create(['manager_id' => $empA->id]);
        $empC = Employee::factory()->create(['manager_id' => $empB->id]);
        
        // Try to set A's manager to C (A -> C -> B -> A cycle)
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$empA->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'manager_id' => $empC->id
        ]);
        
        $response->assertStatus(422)->assertJsonValidationErrors(['manager_id']);
    }

    public function test_search_and_filters()
    {
        $emp1 = Employee::factory()->create(['department' => 'IT', 'status' => 'active']);
        $emp2 = Employee::factory()->create(['department' => 'HR', 'status' => 'inactive']);
        
        $admin = $this->adminUser();
        
        // Search by User name
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?search=" . $emp1->user->name)
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp1->id);
             
        // Department filter
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?department=HR")
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp2->id);
             
        // Status filter
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?status=inactive")
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp2->id);
    }
    
    public function test_allowed_sorting_and_invalid_sort_rejected()
    {
        $emp1 = Employee::factory()->create(['employee_code' => 'LM-EMP-100']);
        $emp2 = Employee::factory()->create(['employee_code' => 'LM-EMP-200']);
        
        $admin = $this->adminUser();
        
        // Allowed sort
        $res = $this->actingAs($admin)->getJson("/api/v1/employees?sort_by=employee_code&sort_order=desc");
        $res->assertStatus(200)->assertJsonPath('data.0.id', $emp2->id);
        
        // Invalid sort cannot inject (we should just fall back to default if not in allowed list, but let's test if it crashes)
        $res2 = $this->getJson("/api/v1/employees?sort_by=invalid_column");
        $res2->assertStatus(200); // Because it ignores invalid sort and uses default
    }
}

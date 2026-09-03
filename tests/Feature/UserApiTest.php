<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\Employee;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_requires_auth_and_permissions(): void
    {
        $this->getJson('/api/v1/users')->assertUnauthorized();

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/users')->assertForbidden();
    }

    public function test_can_create_update_and_show_user_with_employee_linkage(): void
    {
        $admin = $this->adminUser();

        $createResponse = $this->actingAs($admin)->postJson('/api/v1/users', [
            'system_access' => 'create',
            'name' => 'Test Name', 'name' => 'Test Name', 'name' => 'Test User',
            'email' => 'test@example.com',
            'username' => 'testuser',
            'password' => 'password123',
            'roles' => ['employee'],
        ])->assertCreated()->assertJsonMissingPath('data.password');

        $createdUserId = $createResponse->json('data.id');

        $this->assertDatabaseHas('users', [
            'id' => $createdUserId,
            'email' => 'test@example.com',
            'status' => UserStatus::ACTIVE->value,
        ]);

        $user = User::query()->findOrFail($createdUserId);

        Employee::factory()->create([
            'user_id' => $user->id,
            'employee_code' => 'LM-EMP-123456',
        ]);

        $this->actingAs($admin)->putJson("/api/v1/users/{$user->id}", [
            'name' => 'Updated User',
            'email' => 'updated@example.com',
            'username' => 'updateduser',
            'roles' => ['employee', 'client'],
        ])->assertOk();

        $this->actingAs($admin)->getJson("/api/v1/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.employee.employee_code', 'LM-EMP-123456')
            ->assertJsonFragment(['name' => 'Updated User'])
            ->assertJsonMissingPath('data.password');
    }

    public function test_index_returns_newly_created_user_on_first_page(): void
    {
        $admin = $this->adminUser();

        $createResponse = $this->actingAs($admin)->postJson('/api/v1/users', [
            'system_access' => 'create',
            'name' => 'Test Name', 'name' => 'Test Name', 'name' => 'Visible User',
            'email' => 'visible@example.com',
            'username' => 'visibleuser',
            'password' => 'password123',
            'roles' => ['employee'],
        ])->assertCreated();

        $createdUserId = $createResponse->json('data.id');

        $this->assertDatabaseHas('users', [
            'id' => $createdUserId,
            'email' => 'visible@example.com',
            'status' => UserStatus::ACTIVE->value,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/v1/users?per_page=15&sort=created_at&direction=desc&search=visible@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $createdUserId)
            ->assertJsonPath('data.0.username', 'visibleuser')
            ->assertJsonPath('data.0.status', UserStatus::ACTIVE->value);
    }

    public function test_can_activate_deactivate_and_deactivated_user_is_blocked_from_protected_routes(): void
    {
        $admin = $this->adminUser();
        $managedUser = User::factory()->create(['status' => UserStatus::ACTIVE->value]);
        $managedUser->assignRole('admin');

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$managedUser->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::INACTIVE->value);

        $this->actingAs($managedUser->fresh())
            ->getJson('/api/v1/users')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Account is not active.');

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$managedUser->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::ACTIVE->value);
    }

    public function test_password_reset_hashes_password_without_exposing_plaintext(): void
    {
        $admin = $this->adminUser();
        $managedUser = User::factory()->create([
            'password' => Hash::make('old-password-123'),
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$managedUser->id}/reset-password", [
                'system_access' => 'create',
            'name' => 'Test Name', 'name' => 'Test Name', 'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertOk()
            ->assertJsonMissingPath('data.password');

        $managedUser->refresh();

        $this->assertTrue(Hash::check('new-password-123', $managedUser->password));
    }

    public function test_role_management_blocks_super_admin_escalation_by_non_super_admin(): void
    {
        $admin = $this->adminUser();
        $target = User::factory()->create();
        $superAdmin = $this->superAdminUser();

        $this->actingAs($admin)
            ->putJson("/api/v1/users/{$target->id}", [
                'name' => $target->name,
                'email' => $target->email,
                'username' => $target->username,
                'roles' => ['super_admin'],
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->putJson("/api/v1/users/{$superAdmin->id}", [
                'name' => $superAdmin->name,
                'email' => $superAdmin->email,
                'username' => $superAdmin->username,
                'roles' => ['admin'],
            ])
            ->assertForbidden();
    }

    public function test_roles_permissions_matrix_requires_permission_and_can_update_role_permissions(): void
    {
        $plainUser = User::factory()->create(['status' => UserStatus::ACTIVE->value]);

        $this->actingAs($plainUser)
            ->getJson('/api/v1/roles-permissions')
            ->assertForbidden();

        $admin = $this->adminUser();
        $role = Role::firstOrCreate(['name' => 'restricted_ops', 'guard_name' => 'web']);

        $this->actingAs($admin)
            ->getJson('/api/v1/roles-permissions')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Administration'])
            ->assertJsonFragment(['view_invoices'])
            ->assertJsonFragment(['manage_roles_permissions']);

        $this->actingAs($admin)
            ->putJson("/api/v1/roles-permissions/{$role->id}", [
                'permissions' => ['view_dashboard', 'view_invoices', 'create_invoices'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'restricted_ops')
            ->assertJsonPath('data.permissions.0', 'view_dashboard');

        $this->assertTrue($role->fresh()->hasPermissionTo('view_invoices'));
        $this->assertTrue($role->fresh()->hasPermissionTo('create_invoices'));
        $this->assertFalse($role->fresh()->hasPermissionTo('delete_invoices'));
    }

    public function test_super_admin_role_is_seeded_with_all_permissions(): void
    {
        $superAdminRole = Role::findByName('super_admin');

        $this->assertGreaterThan(0, $superAdminRole->permissions()->count());
        $this->assertEquals(Permission::count(), $superAdminRole->permissions()->count());
    }

    public function test_last_active_super_admin_cannot_be_deactivated_deleted_or_stripped_of_role(): void
    {
        $superAdmin = $this->superAdminUser();

        $this->actingAs($superAdmin)
            ->postJson("/api/v1/users/{$superAdmin->id}/deactivate")
            ->assertForbidden();

        $this->actingAs($superAdmin)
            ->putJson("/api/v1/users/{$superAdmin->id}", [
                'system_access' => 'create',
            'name' => 'Test Name', 'name' => 'Test Name', 'name' => $superAdmin->name,
                'email' => $superAdmin->email,
                'username' => $superAdmin->username,
                'roles' => [],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The last active Super Admin cannot be removed, deactivated, or deleted.');

        $otherAdmin = $this->superAdminUser();

        $this->actingAs($otherAdmin)
            ->deleteJson("/api/v1/users/{$superAdmin->id}")
            ->assertNoContent();
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function superAdminUser(): User
    {
        $user = User::factory()->create(['status' => UserStatus::ACTIVE->value]);
        $user->assignRole('super_admin');

        return $user;
    }
}

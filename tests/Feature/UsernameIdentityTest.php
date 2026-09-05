<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\MediaFile;
use App\Models\User;
use App\Models\Employee;
use Spatie\Permission\Models\Role;
use App\Enums\UserStatus;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UsernameIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Ensure the super_admin role exists for tests
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
    }

    public function test_email_login_works()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'username' => 'testuser',
            'password' => bcrypt('password123'),
            'status' => UserStatus::ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'system_access' => 'create',
            'identifier' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertAuthenticatedAs($user);
    }

    public function test_username_login_works()
    {
        $user = User::factory()->create([
            'email' => 'test2@example.com',
            'username' => 'testuser2',
            'password' => bcrypt('password123'),
            'status' => UserStatus::ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'system_access' => 'create',
            'identifier' => 'testuser2',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertAuthenticatedAs($user);
    }

    public function test_logout_works()
    {
        $user = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/auth/logout');
        $response->assertStatus(200);
        $this->assertGuest();
    }

    public function test_auth_me_returns_username()
    {
        $user = User::factory()->create(['username' => 'meuser', 'status' => UserStatus::ACTIVE]);
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');
        $response->assertStatus(200)
                 ->assertJsonPath('data.user.username', 'meuser');
    }

    public function test_own_profile_resolves_by_username()
    {
        $user = User::factory()->create(['username' => 'myprofile', 'status' => UserStatus::ACTIVE]);
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/profiles/myprofile');
        $response->assertStatus(200)
                 ->assertJsonPath('data.profile.username', 'myprofile')
                 ->assertJsonPath('data.profile.avatar_url', null);
    }

    public function test_own_profile_can_update_identity()
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'username' => 'old.username',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/profiles/old.username', [
            'name' => 'New Name',
            'username' => 'new.username',
            'email' => 'new@example.com',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.profile.name', 'New Name')
                 ->assertJsonPath('data.profile.username', 'new.username')
                 ->assertJsonPath('data.profile.email', 'new@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'username' => 'new.username',
            'email' => 'new@example.com',
        ]);
    }

    public function test_own_profile_can_upload_avatar()
    {
        Storage::fake('public');
        $user = User::factory()->create(['username' => 'avatar.user', 'status' => UserStatus::ACTIVE]);
        $this->actingAs($user);

        $response = $this->post('/api/v1/profiles/avatar.user', [
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'avatar' => UploadedFile::fake()->image('avatar.png', 160, 160),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)
                 ->assertJsonPath('data.profile.username', 'avatar.user')
                 ->assertJsonPath('data.profile.avatar_url', fn ($value) => is_string($value) && str_contains($value, '/dashboard-api/api/v1/media-files/'));

        $user->refresh();
        $this->assertNotNull($user->avatar_media_id);
        $this->assertNull($user->avatar_path);
        $media = MediaFile::query()->findOrFail($user->avatar_media_id);
        $this->assertSame('avatars', $media->collection_name);
        Storage::disk('public')->assertExists($media->path);
    }

    public function test_own_profile_can_change_password_with_current_password()
    {
        $user = User::factory()->create([
            'username' => 'password.user',
            'password' => bcrypt('old-password'),
            'status' => UserStatus::ACTIVE,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/profiles/password.user', [
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_own_profile_rejects_wrong_current_password()
    {
        $user = User::factory()->create([
            'username' => 'wrong.password',
            'password' => bcrypt('old-password'),
            'status' => UserStatus::ACTIVE,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/v1/profiles/wrong.password', [
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'current_password' => 'bad-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['current_password']);
    }

    public function test_nonexistent_username_handled_safely()
    {
        $user = User::factory()->create(['username' => 'myprofile', 'status' => UserStatus::ACTIVE]);
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/profiles/nonexistent');
        $response->assertStatus(403);
    }

    public function test_unauthorized_profile_access_blocked()
    {
        $user1 = User::factory()->create(['username' => 'user1', 'status' => UserStatus::ACTIVE]);
        $user2 = User::factory()->create(['username' => 'user2', 'status' => UserStatus::ACTIVE]);
        
        $this->actingAs($user1);

        $response = $this->getJson('/api/v1/profiles/user2');
        $response->assertStatus(403);
    }

    public function test_employee_create_persists_username()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $response = $this->postJson('/api/v1/employees', [
            'system_access' => 'create',
            'name' => 'New Employee',
            'username' => 'newemployee',
            'email' => 'new@example.com',
            'password' => 'password123',
            'status' => 'active'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'username' => 'newemployee',
            'email' => 'new@example.com'
        ]);
    }

    public function test_employee_edit_changes_username()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $user = User::factory()->create(['username' => 'oldusername', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'username' => 'newusername'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'newusername'
        ]);
    }

    public function test_duplicate_username_on_employee_edit_returns_422()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        User::factory()->create(['username' => 'taken', 'status' => UserStatus::ACTIVE]);
        $user2 = User::factory()->create(['username' => 'user2', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user2->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'username' => 'taken'
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['username']);
    }

    public function test_employee_edit_changes_name()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $user = User::factory()->create(['name' => 'Old Name', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'New Name'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name'
        ]);
    }

    public function test_employee_edit_changes_email()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $user = User::factory()->create(['email' => 'old@example.com', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'email' => 'new@example.com'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'new@example.com'
        ]);
    }

    public function test_unchanged_username_accepted()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $user = User::factory()->create(['username' => 'existingusername', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'username' => 'existingusername'
        ]);

        $response->assertStatus(200);
    }

    public function test_unchanged_email_accepted()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        $user = User::factory()->create(['email' => 'existing@example.com', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'email' => 'existing@example.com'
        ]);

        $response->assertStatus(200);
    }

    public function test_duplicate_email_on_employee_edit_returns_422()
    {
        $admin = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $admin->assignRole('super_admin');
        $this->actingAs($admin);

        User::factory()->create(['email' => 'taken@example.com', 'status' => UserStatus::ACTIVE]);
        $user2 = User::factory()->create(['email' => 'user2@example.com', 'status' => UserStatus::ACTIVE]);
        $employee = Employee::factory()->create(['user_id' => $user2->id]);

        $response = $this->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name',
            'email' => 'taken@example.com'
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }
}

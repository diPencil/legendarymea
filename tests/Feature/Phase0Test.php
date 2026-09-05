<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Enums\UserStatus;

class Phase0Test extends TestCase
{
    use RefreshDatabase;

    public function test_database_isolation()
    {
        $dbName = DB::connection()->getDatabaseName();
        $this->assertStringStartsWith('legendary_backend_test', $dbName);
    }

    public function test_health_endpoint()
    {
        $response = $this->getJson('/api/v1/health');
        $response->assertStatus(200)->assertJson(['success' => true, 'data' => ['status' => 'ok']]);
    }

    public function test_login_success()
    {
        $user = User::factory()->create(['password' => bcrypt('password123'), 'status' => UserStatus::ACTIVE]);
        $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123']);
        $response->assertStatus(200);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_invalid_credentials()
    {
        $user = User::factory()->create(['password' => bcrypt('password123')]);
        $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrongpass']);
        $response->assertStatus(401);
    }

    public function test_inactive_login_denied()
    {
        $user = User::factory()->create(['password' => bcrypt('password123'), 'status' => UserStatus::INACTIVE]);
        $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123']);
        $response->assertStatus(403);
    }
    
    public function test_me_endpoint_authenticated()
    {
        $user = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $this->actingAs($user);
        $response = $this->getJson('/api/v1/auth/me');
        $response->assertStatus(200)->assertJsonPath('success', true);
    }

    public function test_super_admin_bypass()
    {
        $this->artisan('db:seed');
        $user = User::factory()->create();
        $user->assignRole('super_admin');
        
        $this->assertTrue($user->can('view_companies'));
    }

    public function test_login_audit_created()
    {
        $user = User::factory()->create(['password' => bcrypt('password123'), 'status' => UserStatus::ACTIVE]);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123']);
        
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'system.login'
        ]);
    }

    public function test_logout_audit_created()
    {
        $user = User::factory()->create(['password' => bcrypt('password123'), 'status' => UserStatus::ACTIVE]);
        $this->actingAs($user);
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)->assertJsonPath('success', true);
        $response->assertCookie('XSRF-TOKEN');
        $this->assertGuest('web');
        
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'system.logout'
        ]);
    }

    public function test_logout_invalidates_session_and_me_returns_unauthenticated()
    {
        $user = User::factory()->create(['password' => bcrypt('password123'), 'status' => UserStatus::ACTIVE]);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertStatus(200);

        $this->assertAuthenticatedAs($user, 'web');

        $this->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertCookie('XSRF-TOKEN');

        $this->assertGuest('web');

        $this->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function test_unauthenticated_logout_returns_unauthenticated()
    {
        $this->postJson('/api/v1/auth/logout')
            ->assertStatus(401);
    }

    public function test_forgot_password_sends_link()
    {
        $user = User::factory()->create(['status' => UserStatus::ACTIVE]);
        $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);
        $response->assertStatus(200);
    }

    public function test_localization_middleware()
    {
        $response = $this->withHeaders(['Accept-Language' => 'ar'])->getJson('/api/v1/health');
        $this->assertEquals('ar', app()->getLocale());
    }
}

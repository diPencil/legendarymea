<?php

namespace Tests\Feature\Portal;

use App\Models\Company;
use App\Models\Contract;
use App\Models\Setting;
use App\Models\User;
use App\Enums\UserStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClientPortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::firstOrCreate(['name' => 'view_companies']);
        Permission::firstOrCreate(['name' => 'manage_companies']);
        Role::firstOrCreate(['name' => 'client']);

        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $manager->givePermissionTo(['view_companies', 'manage_companies']);

        foreach ([
            'from_name' => 'Legendary Management MEA',
            'from_email' => 'sales@legendarymea.com',
            'smtp_host' => 'smtp.example.test',
            'smtp_port' => '587',
            'smtp_encryption' => 'tls',
            'smtp_username' => 'sales@legendarymea.com',
            'smtp_auth_enabled' => '1',
            'smtp_timeout' => '30',
        ] as $key => $value) {
            Setting::create(['group' => 'email_configuration', 'key' => $key, 'value' => $value, 'type' => 'string']);
        }

        Setting::create(['group' => 'email_configuration', 'key' => 'smtp_password', 'value' => Crypt::encryptString('secret'), 'type' => 'encrypted']);
    }

    public function test_company_creation_provisions_client_portal_user(): void
    {
        Mail::fake();

        $admin = User::factory()->create();
        $admin->assignRole('Manager');

        $response = $this->actingAs($admin)->postJson('/api/v1/companies', [
            'name' => 'Portal Client Company',
            'email' => 'client@example.com',
            'relationship_types' => ['client'],
            'portal_access_enabled' => true,
            'portal_email' => 'client@example.com',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.portal_access.login_email', 'client@example.com')
            ->assertJsonPath('data.portal_access.users_count', 1);

        $company = Company::where('name', 'Portal Client Company')->firstOrFail();
        $client = User::where('email', 'client@example.com')->firstOrFail();

        $this->assertSame($company->id, $client->company_id);
        $this->assertTrue($client->hasRole('client'));
        $this->assertTrue($client->must_change_password);
        $this->assertNotNull($client->portal_invited_at);
    }

    public function test_portal_endpoints_are_scoped_to_authenticated_company(): void
    {
        $company = Company::factory()->create();
        $otherCompany = Company::factory()->create();
        $client = User::factory()->create(['company_id' => $company->id]);
        $client->assignRole('client');

        $ownContract = Contract::factory()->create(['company_id' => $company->id]);
        $otherContract = Contract::factory()->create(['company_id' => $otherCompany->id]);

        $this->actingAs($client)->getJson('/api/v1/portal/contracts')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownContract->id])
            ->assertJsonMissing(['id' => $otherContract->id]);

        $this->actingAs($client)->getJson("/api/v1/portal/contracts/{$otherContract->id}")
            ->assertNotFound();
    }

    public function test_client_user_cannot_access_internal_companies_endpoint(): void
    {
        $client = User::factory()->create(['company_id' => Company::factory()->create()->id]);
        $client->assignRole('client');

        $this->actingAs($client)->getJson('/api/v1/companies')->assertForbidden();
    }

    public function test_invited_client_becomes_active_after_successful_login(): void
    {
        $invitedAt = now()->subMinute();
        $client = User::factory()->create([
            'company_id' => Company::factory()->create()->id,
            'email' => 'invited-client@example.com',
            'username' => 'invited-client',
            'password' => Hash::make('temporary-password'),
            'status' => UserStatus::INVITED->value,
            'must_change_password' => true,
            'portal_invited_at' => $invitedAt,
        ]);
        $client->assignRole('client');

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'invited-client',
            'password' => 'temporary-password',
        ])->assertOk()
            ->assertJsonPath('data.user.status', UserStatus::ACTIVE->value)
            ->assertJsonPath('data.user.must_change_password', true);

        $client->refresh();

        $this->assertSame(UserStatus::ACTIVE, $client->status);
        $this->assertTrue($client->must_change_password);
        $this->assertNotNull($client->last_login_at);
        $this->assertSame($invitedAt->toDateTimeString(), $client->portal_invited_at->toDateTimeString());
    }
}

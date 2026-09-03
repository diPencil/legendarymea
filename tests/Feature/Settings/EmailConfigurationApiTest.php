<?php

namespace Tests\Feature\Settings;

use App\Enums\EmailStatus;
use App\Models\EmailMessage;
use App\Models\Setting;
use App\Models\User;
use App\Services\EmailConfigurationService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class EmailConfigurationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_email_configuration_authorization_is_enforced(): void
    {
        $this->getJson('/api/v1/settings/email')->assertUnauthorized();
        $this->putJson('/api/v1/settings/email', [])->assertUnauthorized();
        $this->postJson('/api/v1/settings/email/test-outgoing', [])->assertUnauthorized();
        $this->postJson('/api/v1/settings/email/test-incoming', [])->assertUnauthorized();

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/settings/email')->assertForbidden();
        $this->actingAs($user)->putJson('/api/v1/settings/email', [])->assertForbidden();
    }

    public function test_email_configuration_update_encrypts_passwords_and_never_returns_them(): void
    {
        $admin = $this->adminUser();

        $response = $this->actingAs($admin)
            ->putJson('/api/v1/settings/email', $this->validPayload([
                'smtp_password' => 'smtp-secret',
                'incoming_password' => 'incoming-secret',
            ]))
            ->assertOk()
            ->assertJsonPath('data.smtp_password_configured', true)
            ->assertJsonPath('data.incoming_password_configured', true)
            ->assertJsonMissingPath('data.smtp_password')
            ->assertJsonMissingPath('data.incoming_password');

        $this->assertStringNotContainsString('smtp-secret', $response->getContent());
        $this->assertStringNotContainsString('incoming-secret', $response->getContent());

        $storedSmtp = Setting::query()->where('key', 'smtp_password')->value('value');
        $storedIncoming = Setting::query()->where('key', 'incoming_password')->value('value');

        $this->assertNotSame('smtp-secret', $storedSmtp);
        $this->assertNotSame('incoming-secret', $storedIncoming);
        $this->assertSame('smtp-secret', Crypt::decryptString($storedSmtp));
        $this->assertSame('incoming-secret', Crypt::decryptString($storedIncoming));
    }

    public function test_blank_password_preserves_existing_and_new_password_replaces_it(): void
    {
        $admin = $this->adminUser();

        $this->actingAs($admin)->putJson('/api/v1/settings/email', $this->validPayload([
            'smtp_password' => 'old-smtp-secret',
            'incoming_password' => 'old-incoming-secret',
        ]))->assertOk();

        $oldSmtp = Setting::query()->where('key', 'smtp_password')->value('value');

        $this->actingAs($admin)->putJson('/api/v1/settings/email', $this->validPayload([
            'from_name' => 'Legendary Mail',
            'smtp_password' => '',
            'incoming_password' => '',
        ]))->assertOk();

        $this->assertSame($oldSmtp, Setting::query()->where('key', 'smtp_password')->value('value'));

        $this->actingAs($admin)->putJson('/api/v1/settings/email', $this->validPayload([
            'smtp_password' => 'new-smtp-secret',
            'incoming_password' => '',
        ]))->assertOk();

        $this->assertSame('new-smtp-secret', Crypt::decryptString(Setting::query()->where('key', 'smtp_password')->value('value')));
        $this->assertSame('old-incoming-secret', Crypt::decryptString(Setting::query()->where('key', 'incoming_password')->value('value')));
    }

    public function test_invalid_email_configuration_values_are_rejected(): void
    {
        $admin = $this->adminUser();

        $this->actingAs($admin)->putJson('/api/v1/settings/email', $this->validPayload([
            'from_email' => 'not-email',
            'smtp_port' => 70000,
            'smtp_encryption' => 'starttls',
            'incoming_protocol' => 'smtp',
            'incoming_encryption' => 'starttls',
        ]))->assertJsonValidationErrors([
            'from_email',
            'smtp_port',
            'smtp_encryption',
            'incoming_protocol',
            'incoming_encryption',
        ]);
    }

    public function test_connection_test_endpoints_are_permission_protected_and_safe(): void
    {
        $this->app->instance(EmailConfigurationService::class, new class extends EmailConfigurationService {
            public function sendTestEmail(array $override, string $recipient): void {}

            public function testIncoming(array $override = []): array
            {
                throw new \RuntimeException('Unable to connect with password=secret');
            }
        });

        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_settings');

        $this->actingAs($viewer)
            ->postJson('/api/v1/settings/email/test-outgoing', $this->validPayload(['test_recipient' => 'admin@example.com']))
            ->assertForbidden();

        $admin = $this->adminUser();

        $this->actingAs($admin)
            ->postJson('/api/v1/settings/email/test-outgoing', $this->validPayload([
                'test_recipient' => 'admin@example.com',
                'smtp_password' => 'safe-secret',
            ]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'SMTP accepted the test email. Please check the recipient inbox and spam folder.')
            ->assertJsonPath('data.recipient', 'admin@example.com');

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/settings/email/test-incoming', $this->validPayload(['incoming_password' => 'incoming-secret']))
            ->assertStatus(422);

        $this->assertStringNotContainsString('incoming-secret', $response->getContent());
    }

    public function test_outgoing_connection_test_returns_safe_failure_message(): void
    {
        $this->app->instance(EmailConfigurationService::class, new class extends EmailConfigurationService {
            public function sendTestEmail(array $override, string $recipient): void
            {
                throw new \Exception('SMTP authentication failed password=super-secret');
            }
        });

        $admin = $this->adminUser();

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/settings/email/test-outgoing', $this->validPayload([
                'test_recipient' => 'admin@example.com',
                'smtp_password' => 'super-secret',
            ]))
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'SMTP authentication failed password [hidden]');

        $this->assertStringNotContainsString('super-secret', $response->getContent());
    }

    public function test_existing_email_send_uses_database_smtp_configuration_and_persists_status(): void
    {
        $admin = $this->adminUser();

        $this->actingAs($admin)->putJson('/api/v1/settings/email', $this->validPayload([
            'smtp_host' => 'smtp.database.example.com',
            'smtp_password' => 'smtp-secret',
            'incoming_password' => 'incoming-secret',
        ]))->assertOk();

        $this->assertSame('smtp.database.example.com', app(EmailConfigurationService::class)->outgoingMailerConfig()['host']);

        $email = EmailMessage::query()->create([
            'reference' => 'LM-EML-' . now()->format('Y') . '-123456',
            'subject' => 'Configured SMTP',
            'body' => '<p>Configured body</p>',
            'to_address' => 'recipient@example.com',
            'to_name' => 'Recipient',
            'status' => EmailStatus::DRAFT,
            'created_by' => $admin->id,
        ]);

        $this->app->instance(EmailConfigurationService::class, new class extends EmailConfigurationService {
            public function sendEmailMessage(EmailMessage $email): void {}
        });

        $this->actingAs($admin)->postJson("/api/v1/emails/{$email->id}/send")->assertOk();

        $this->assertDatabaseHas('email_messages', [
            'id' => $email->id,
            'status' => EmailStatus::SENT->value,
        ]);
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'from_name' => 'Legendary Management MEA',
            'from_email' => 'sales@legendarymea.com',
            'smtp_host' => 'smtp.example.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
            'smtp_username' => 'sales@example.com',
            'smtp_password' => 'smtp-secret',
            'smtp_auth_enabled' => true,
            'smtp_timeout' => 30,
            'incoming_protocol' => 'imap',
            'incoming_host' => 'imap.example.com',
            'incoming_port' => 993,
            'incoming_encryption' => 'ssl',
            'incoming_username' => 'sales@example.com',
            'incoming_password' => 'incoming-secret',
            'incoming_mailbox' => 'INBOX',
        ], $overrides);
    }
}

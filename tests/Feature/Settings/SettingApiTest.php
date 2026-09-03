<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed settings
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
        $this->artisan('db:seed', ['--class' => 'SettingsSeeder']);
        
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole('super_admin');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->employee = User::factory()->create();
        $this->employee->assignRole('employee');
    }

    public function test_auth_and_permissions_required()
    {
        // Unauthenticated
        $this->getJson('/api/v1/settings')->assertUnauthorized();
        $this->putJson('/api/v1/settings/general')->assertUnauthorized();

        // Employee without permissions
        $this->actingAs($this->employee)
            ->getJson('/api/v1/settings')
            ->assertForbidden();
            
        $this->actingAs($this->employee)
            ->putJson('/api/v1/settings/general')
            ->assertForbidden();
    }

    public function test_can_read_settings_with_view_permission()
    {
        $this->employee->givePermissionTo('view_settings');

        $this->actingAs($this->employee)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => ['general', 'contact', 'localization', 'social', 'website_defaults']]);

        // Should still be forbidden from updating
        $this->actingAs($this->employee)
            ->putJson('/api/v1/settings/general', ['settings' => ['company_display_name' => 'Test']])
            ->assertForbidden();
    }

    public function test_static_project_data_backfills_empty_settings()
    {
        Setting::query()->whereIn('key', [
            'public_email',
            'sales_email',
            'phone',
            'whatsapp',
            'address_en',
            'address_ar',
            'contact_note_en',
            'contact_note_ar',
            'default_meta_title_en',
            'default_meta_title_ar',
            'default_meta_description_en',
            'default_meta_description_ar',
        ])->update(['value' => null]);

        $this->artisan('db:seed', ['--class' => 'SettingsSeeder']);

        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'public_email', 'value' => 'info@legendarymea.com']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'sales_email', 'value' => 'sales@legendarymea.com']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'phone', 'value' => '+966 53 314 4910']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'whatsapp', 'value' => '+966 53 314 4910']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'address_en', 'value' => 'Riyadh, Saudi Arabia']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'address_ar', 'value' => 'الرياض، المملكة العربية السعودية']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'contact_note_en', 'value' => 'Wherever your business is based, our team is ready to support you and follow through on what you need.']);
        $this->assertDatabaseHas('settings', ['group' => 'contact', 'key' => 'contact_note_ar', 'value' => 'وين ما كان موقع أعمالك، فريقنا حاضر لخدمتك ومتابعة احتياجك.']);
        $this->assertDatabaseHas('settings', ['group' => 'website_defaults', 'key' => 'default_meta_title_en', 'value' => 'Legendary Management MEA | Travel, Hospitality & Technology']);
        $this->assertDatabaseHas('settings', ['group' => 'website_defaults', 'key' => 'default_meta_title_ar', 'value' => 'ليجندري مانجمنت الشرق الأوسط وأفريقيا | السفر والضيافة والتقنية']);
        $this->assertDatabaseHas('settings', ['group' => 'website_defaults', 'key' => 'default_meta_description_en', 'value' => 'Travel arrangements, commercial partnerships and B2B travel technology for agencies, companies and hospitality partners across the Middle East and Africa.']);
        $this->assertDatabaseHas('settings', ['group' => 'website_defaults', 'key' => 'default_meta_description_ar', 'value' => 'ترتيبات سفر وعلاقات تجارية وتقنية لأعمال السفر والضيافة في الشرق الأوسط وأفريقيا.']);
    }

    public function test_backfill_is_idempotent_and_preserves_admin_values()
    {
        Setting::query()->where('key', 'public_email')->update(['value' => 'admin@example.com']);
        Setting::query()->where('key', 'default_meta_title_en')->update(['value' => 'Admin SEO Title']);

        $this->artisan('db:seed', ['--class' => 'SettingsSeeder']);
        $this->artisan('db:seed', ['--class' => 'SettingsSeeder']);

        $this->assertSame('admin@example.com', Setting::query()->where('key', 'public_email')->value('value'));
        $this->assertSame('Admin SEO Title', Setting::query()->where('key', 'default_meta_title_en')->value('value'));
    }

    public function test_settings_api_returns_backfilled_values_and_save_reload_persists()
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.general.company_display_name', 'Legendary Management MEA')
            ->assertJsonPath('data.contact.public_email', 'info@legendarymea.com')
            ->assertJsonPath('data.contact.sales_email', 'sales@legendarymea.com')
            ->assertJsonPath('data.contact.contact_note_en', 'Wherever your business is based, our team is ready to support you and follow through on what you need.')
            ->assertJsonPath('data.website_defaults.default_meta_title_en', 'Legendary Management MEA | Travel, Hospitality & Technology');

        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/general', [
                'settings' => ['company_display_name' => 'Legendary Management MEA Runtime Check'],
            ])
            ->assertOk()
            ->assertJsonPath('data.company_display_name', 'Legendary Management MEA Runtime Check');

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.general.company_display_name', 'Legendary Management MEA Runtime Check');
    }

    public function test_can_update_settings_with_manage_permission()
    {
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/general', [
                'settings' => [
                    'company_display_name' => 'New Name',
                    'legal_name' => 'New Legal',
                ]
            ])
            ->assertOk();

        $this->assertDatabaseHas('settings', [
            'key' => 'company_display_name',
            'value' => 'New Name'
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'legal_name',
            'value' => 'New Legal'
        ]);
    }

    public function test_rejects_unknown_group_and_keys()
    {
        // Unknown group
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/unknown_group', [
                'settings' => ['company_display_name' => 'Test']
            ])
            ->assertJsonValidationErrors(['group']);

        // Unknown key
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/general', [
                'settings' => ['unknown_key' => 'Test']
            ])
            ->assertJsonValidationErrors(['unknown_key']);
    }

    public function test_rejects_secret_patterns()
    {
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/general', [
                'settings' => ['password' => 'secret']
            ])
            ->assertJsonValidationErrors(['password']);
    }

    public function test_validates_types_and_formats()
    {
        // Invalid email
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/contact', [
                'settings' => ['public_email' => 'not-an-email']
            ])
            ->assertJsonValidationErrors(['public_email']);

        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/contact', [
                'settings' => ['sales_email' => 'not-an-email']
            ])
            ->assertJsonValidationErrors(['sales_email']);

        // Invalid locale
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/localization', [
                'settings' => ['default_locale' => 'fr'] // only en, ar allowed
            ])
            ->assertJsonValidationErrors(['default_locale']);

        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/localization', [
                'settings' => ['default_currency' => 'XYZ']
            ])
            ->assertJsonValidationErrors(['default_currency']);

        // Invalid social URL
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/social', [
                'settings' => ['facebook_url' => 'javascript:alert(1)']
            ])
            ->assertJsonValidationErrors(['facebook_url']);

        // Valid updates
        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/localization', [
                'settings' => [
                    'default_locale' => 'ar',
                    'default_currency' => null,
                    'timezone' => 'Asia/Dubai',
                ]
            ])
            ->assertOk()
            ->assertJsonPath('data.default_currency', null);

        $this->actingAs($this->admin)
            ->putJson('/api/v1/settings/localization', [
                'settings' => [
                    'default_currency' => 'AED',
                    'timezone' => 'Africa/Cairo',
                ]
            ])
            ->assertOk()
            ->assertJsonPath('data.default_currency', 'AED')
            ->assertJsonPath('data.timezone', 'Africa/Cairo');
    }

    public function test_public_endpoint_returns_only_public_settings_and_filters_secrets()
    {
        $response = $this->getJson('/api/v1/public/settings')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'general', 'contact', 'localization', 'social', 'website_defaults'
                ]
            ]);
            
        $data = $response->json('data');
        $this->assertArrayHasKey('company_display_name', $data['general']);
        $this->assertSame('sales@legendarymea.com', $data['contact']['sales_email']);
        $this->assertSame('Wherever your business is based, our team is ready to support you and follow through on what you need.', $data['contact']['contact_note_en']);
    }
}

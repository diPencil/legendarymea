<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Cache;

class SettingsSeeder extends Seeder
{
    private const STATIC_BACKFILL = [
        'general' => [
            'company_display_name' => 'Legendary Management MEA',
        ],
        'contact' => [
            'public_email' => 'info@legendarymea.com',
            'sales_email' => 'sales@legendarymea.com',
            'phone' => '+966 53 314 4910',
            'whatsapp' => '+966 53 314 4910',
            'address_en' => 'Riyadh, Saudi Arabia',
            'address_ar' => 'الرياض، المملكة العربية السعودية',
            'contact_note_en' => 'Wherever your business is based, our team is ready to support you and follow through on what you need.',
            'contact_note_ar' => 'وين ما كان موقع أعمالك، فريقنا حاضر لخدمتك ومتابعة احتياجك.',
        ],
        'localization' => [
            'default_locale' => 'en',
            'default_currency' => 'USD',
            'timezone' => 'UTC',
        ],
        'website_defaults' => [
            'default_meta_title_en' => 'Legendary Management MEA | Travel, Hospitality & Technology',
            'default_meta_title_ar' => 'ليجندري مانجمنت الشرق الأوسط وأفريقيا | السفر والضيافة والتقنية',
            'default_meta_description_en' => 'Travel arrangements, commercial partnerships and B2B travel technology for agencies, companies and hospitality partners across the Middle East and Africa.',
            'default_meta_description_ar' => 'ترتيبات سفر وعلاقات تجارية وتقنية لأعمال السفر والضيافة في الشرق الأوسط وأفريقيا.',
        ],
        'email_configuration' => [
            'from_name' => 'Legendary Management MEA',
            'from_email' => 'info@legendarymea.com',
        ],
    ];

    public function run(): void
    {
        foreach (SettingsService::WHITELIST as $group => $settings) {
            foreach ($settings as $key => $definition) {
                $this->upsertSetting($group, $key, $definition['type'], $definition['default']);
            }
        }

        foreach (self::STATIC_BACKFILL as $group => $settings) {
            foreach ($settings as $key => $value) {
                $type = SettingsService::WHITELIST[$group][$key]['type'] ?? 'string';
                $this->upsertSetting($group, $key, $type, $value);
            }
        }

        Cache::forget('settings:all');
        Cache::forget('settings:public');

        foreach (array_keys(SettingsService::WHITELIST) as $group) {
            Cache::forget('settings:group:' . $group);
        }
    }

    private function upsertSetting(string $group, string $key, string $type, mixed $value): void
    {
        $setting = Setting::where('key', $key)->first();

        if (!$setting) {
            Setting::create([
                'group' => $group,
                'key' => $key,
                'value' => $value,
                'type' => $type,
            ]);

            return;
        }

        $updates = [];

        if ($setting->group !== $group) {
            $updates['group'] = $group;
        }

        if ($setting->type !== $type) {
            $updates['type'] = $type;
        }

        if (blank($setting->value) && filled($value)) {
            $updates['value'] = $value;
        }

        if ($updates !== []) {
            $setting->update($updates);
        }
    }
}

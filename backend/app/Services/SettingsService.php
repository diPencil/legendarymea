<?php

namespace App\Services;

use App\Models\Setting;
use App\Enums\CurrencyCode;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class SettingsService
{
    private const CACHE_KEY_PREFIX = 'settings:group:';
    private const CACHE_PUBLIC_KEY = 'settings:public';
    private const CACHE_ALL_KEY = 'settings:all';
    
    // Define the single source of truth for settings
    public const WHITELIST = [
        'general' => [
            'company_display_name' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => 'Legendary Management MEA'],
            'legal_name' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
        ],
        'contact' => [
            'public_email' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|email|max:255', 'default' => null],
            'sales_email' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|email|max:255', 'default' => null],
            'phone' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:50', 'default' => null],
            'whatsapp' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:50', 'default' => null],
            'address_en' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
            'address_ar' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
            'contact_note_en' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
            'contact_note_ar' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
        ],
        'localization' => [
            'default_locale' => ['type' => 'string', 'public' => true, 'rules' => 'required|string|in:en,ar', 'default' => 'en'],
            'default_currency' => ['type' => 'string', 'public' => true, 'rules' => null, 'default' => 'USD'],
            'timezone' => ['type' => 'string', 'public' => true, 'rules' => 'required|string|timezone', 'default' => 'UTC'],
        ],
        'social' => [
            'facebook_url' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|url:http,https|max:255', 'default' => null],
            'instagram_url' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|url:http,https|max:255', 'default' => null],
            'linkedin_url' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|url:http,https|max:255', 'default' => null],
            'x_url' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|url:http,https|max:255', 'default' => null],
            'youtube_url' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|url:http,https|max:255', 'default' => null],
        ],
        'website_defaults' => [
            'default_meta_title_en' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'default_meta_title_ar' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'default_meta_description_en' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
            'default_meta_description_ar' => ['type' => 'text', 'public' => true, 'rules' => 'nullable|string|max:1000', 'default' => null],
        ],
        'banking' => [
            'bank_name' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'account_name' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'account_number' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'iban' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
            'swift_code' => ['type' => 'string', 'public' => true, 'rules' => 'nullable|string|max:255', 'default' => null],
        ],
    ];

    private const FORBIDDEN_PATTERNS = [
        'password', 'secret', 'token', 'private_key', 'api_key', 'credential', 'app_key', 'db_', 'smtp_', 'mail_'
    ];

    public function getAllGroups(): array
    {
        return Cache::rememberForever(self::CACHE_ALL_KEY, function () {
            $all = [];
            foreach (self::WHITELIST as $groupName => $keys) {
                $all[$groupName] = $this->getGroup($groupName);
            }
            return $all;
        });
    }

    public function getGroup(string $group): array
    {
        if (!isset(self::WHITELIST[$group])) {
            return [];
        }

        return Cache::rememberForever(self::CACHE_KEY_PREFIX . $group, function () use ($group) {
            $dbSettings = Setting::where('group', $group)->pluck('value', 'key')->toArray();
            $result = [];

            foreach (self::WHITELIST[$group] as $key => $definition) {
                $rawValue = array_key_exists($key, $dbSettings) ? $dbSettings[$key] : $definition['default'];
                $result[$key] = $this->castValue($rawValue, $definition['type']);
            }

            return $result;
        });
    }

    public function getPublicSettings(): array
    {
        return Cache::rememberForever(self::CACHE_PUBLIC_KEY, function () {
            $public = [];
            $allGroups = $this->getAllGroups();

            foreach (self::WHITELIST as $groupName => $keys) {
                $public[$groupName] = [];
                foreach ($keys as $key => $definition) {
                    if ($definition['public']) {
                        $public[$groupName][$key] = $allGroups[$groupName][$key] ?? $definition['default'];
                    }
                }
            }
            return $public;
        });
    }

    public function updateGroup(string $group, array $data): array
    {
        if (!isset(self::WHITELIST[$group])) {
            throw ValidationException::withMessages(['group' => 'Invalid setting group.']);
        }

        $rules = [];
        $validatedData = [];

        foreach ($data as $key => $value) {
            if (!isset(self::WHITELIST[$group][$key])) {
                throw ValidationException::withMessages([$key => 'Unknown setting key.']);
            }
            $this->ensureKeyIsSafe($key);
            $rules[$key] = $this->rulesFor($group, $key);
            $validatedData[$key] = $value;
        }

        $validator = Validator::make($validatedData, $rules);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        foreach ($validatedData as $key => $value) {
            $definition = self::WHITELIST[$group][$key];
            
            if ($definition['type'] === 'json' && is_array($value)) {
                $value = json_encode($value);
            }

            $setting = Setting::updateOrCreate(
                ['group' => $group, 'key' => $key],
                ['value' => $value, 'type' => $definition['type']]
            );

            \App\Models\AuditLog::create([
                'user_id' => auth()->id() ?? 1,
                'action' => 'updated',
                'description' => "Updated setting: {$key}",
                'auditable_type' => Setting::class,
                'auditable_id' => $setting->id,
                'metadata' => [
                    'group' => $group,
                    'key' => $key,
                ],
            ]);
        }

        $this->invalidateCache($group);

        return $this->getGroup($group);
    }
    
    public function getValue(string $group, string $key)
    {
        $groupData = $this->getGroup($group);
        return $groupData[$key] ?? null;
    }

    private function castValue($value, string $type)
    {
        if ($value === null) {
            return null;
        }

        switch ($type) {
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'integer':
                return (int) $value;
            case 'json':
                return is_string($value) ? json_decode($value, true) : $value;
            case 'text':
            case 'string':
            default:
                return (string) $value;
        }
    }

    private function rulesFor(string $group, string $key): string
    {
        if ($group === 'localization' && $key === 'default_currency') {
            return 'nullable|string|in:' . implode(',', CurrencyCode::values());
        }

        return self::WHITELIST[$group][$key]['rules'];
    }

    private function ensureKeyIsSafe(string $key): void
    {
        $lowerKey = strtolower($key);
        foreach (self::FORBIDDEN_PATTERNS as $pattern) {
            if (Str::contains($lowerKey, $pattern)) {
                throw ValidationException::withMessages([$key => 'Forbidden setting key pattern.']);
            }
        }
    }

    private function invalidateCache(string $group): void
    {
        Cache::forget(self::CACHE_KEY_PREFIX . $group);
        Cache::forget(self::CACHE_PUBLIC_KEY);
        Cache::forget(self::CACHE_ALL_KEY);
    }
}

<?php

namespace App\Policies;

use App\Models\Setting;
use App\Models\User;
use App\Support\PermissionAccess;

class SettingPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::can($user, 'view_settings', 'manage_settings');
    }

    public function view(User $user, Setting $setting): bool
    {
        return PermissionAccess::can($user, 'view_settings', 'manage_settings');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::can($user, 'update_settings', 'manage_settings');
    }

    public function update(User $user, Setting $setting): bool
    {
        return PermissionAccess::can($user, 'update_settings', 'manage_settings');
    }

    public function delete(User $user, Setting $setting): bool
    {
        return PermissionAccess::can($user, 'update_settings', 'manage_settings');
    }
}

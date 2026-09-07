<?php

namespace App\Support;

use App\Models\User;

final class PermissionAccess
{
    public static function can(User $user, string ...$permissions): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        if ($user->hasRole('client') && ! $user->hasAnyRole(['admin', 'employee'])) {
            return false;
        }

        return $user->hasAnyPermission($permissions);
    }

    public static function canView(User $user, string $resource): bool
    {
        return self::can($user, "view_{$resource}", "manage_{$resource}");
    }

    public static function canCreate(User $user, string $resource): bool
    {
        return self::can($user, "create_{$resource}", "manage_{$resource}");
    }

    public static function canUpdate(User $user, string $resource): bool
    {
        return self::can($user, "update_{$resource}", "manage_{$resource}");
    }

    public static function canDelete(User $user, string $resource): bool
    {
        return self::can($user, "delete_{$resource}", "manage_{$resource}");
    }
}

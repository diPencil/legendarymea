<?php

namespace App\Support;

use App\Models\User;

final class PermissionAccess
{
    public static function can(User $user, string ...$permissions): bool
    {
        if (self::hasRole($user, 'super_admin')) {
            return true;
        }

        if (self::hasRole($user, 'client') && ! self::hasAnyRole($user, ['admin', 'manager', 'employee', 'super_admin'])) {
            return false;
        }

        return $user->hasAnyPermission($permissions);
    }

    public static function hasRole(User $user, string $role): bool
    {
        return $user->getRoleNames()
            ->map(fn (string $name) => strtolower($name))
            ->contains(strtolower($role));
    }

    public static function hasAnyRole(User $user, array $roles): bool
    {
        $normalizedRoles = collect($roles)
            ->map(fn (string $role) => strtolower($role))
            ->all();

        return $user->getRoleNames()
            ->map(fn (string $name) => strtolower($name))
            ->intersect($normalizedRoles)
            ->isNotEmpty();
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

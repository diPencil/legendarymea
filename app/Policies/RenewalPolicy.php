<?php

namespace App\Policies;

use App\Models\Renewal;
use App\Models\User;
use App\Support\PermissionAccess;

class RenewalPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'renewals');
    }

    public function view(User $user, Renewal $renewal): bool
    {
        return PermissionAccess::canView($user, 'renewals');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'renewals');
    }

    public function update(User $user, Renewal $renewal): bool
    {
        return PermissionAccess::canUpdate($user, 'renewals');
    }

    public function delete(User $user, Renewal $renewal): bool
    {
        return PermissionAccess::canDelete($user, 'renewals');
    }
}

<?php

namespace App\Policies;

use App\Models\Career;
use App\Models\User;
use App\Support\PermissionAccess;

class CareerPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'careers');
    }

    public function view(User $user, Career $career): bool
    {
        return PermissionAccess::canView($user, 'careers');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'careers');
    }

    public function update(User $user, Career $career): bool
    {
        return PermissionAccess::canUpdate($user, 'careers');
    }

    public function delete(User $user, Career $career): bool
    {
        return PermissionAccess::canDelete($user, 'careers');
    }
}

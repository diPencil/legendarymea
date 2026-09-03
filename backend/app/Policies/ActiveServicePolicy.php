<?php

namespace App\Policies;

use App\Models\ActiveService;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\Response;

class ActiveServicePolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'active_services');
    }

    public function view(User $user, ActiveService $activeService): bool
    {
        return PermissionAccess::canView($user, 'active_services');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'active_services');
    }

    public function update(User $user, ActiveService $activeService): bool
    {
        return PermissionAccess::canUpdate($user, 'active_services');
    }

    public function delete(User $user, ActiveService $activeService): bool
    {
        return PermissionAccess::canDelete($user, 'active_services');
    }
}

<?php

namespace App\Policies;

use App\Models\Request;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\Response;

class RequestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'requests');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Request $request): bool
    {
        return PermissionAccess::canView($user, 'requests');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'requests');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Request $request): bool
    {
        return PermissionAccess::canUpdate($user, 'requests');
    }

    public function assign(User $user, Request $request): bool
    {
        return PermissionAccess::can($user, 'assign_requests');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Request $request): bool
    {
        return PermissionAccess::canDelete($user, 'requests');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Request $request): bool
    {
        return PermissionAccess::canUpdate($user, 'requests');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Request $request): bool
    {
        return PermissionAccess::canDelete($user, 'requests');
    }
}

<?php

namespace App\Policies;

use App\Models\FollowUp;
use App\Models\User;
use App\Support\PermissionAccess;

class FollowUpPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'follow_ups');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::canView($user, 'follow_ups');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'follow_ups');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::canUpdate($user, 'follow_ups');
    }

    public function assign(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::can($user, 'assign_follow_ups');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::canDelete($user, 'follow_ups');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::canUpdate($user, 'follow_ups');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, FollowUp $followUp): bool
    {
        return PermissionAccess::canDelete($user, 'follow_ups');
    }
}

<?php

namespace App\Policies;

use App\Models\Opportunity;
use App\Models\User;
use App\Support\PermissionAccess;

class OpportunityPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }
        return PermissionAccess::canView($user, 'opportunities');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Opportunity $opportunity): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }

        if (PermissionAccess::canUpdate($user, 'opportunities')) {
            return true;
        }

        if (PermissionAccess::canView($user, 'opportunities')) {
            return $user->employee && $opportunity->owner_id === $user->employee->id;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }
        return PermissionAccess::canCreate($user, 'opportunities');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Opportunity $opportunity): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }

        if (PermissionAccess::canUpdate($user, 'opportunities')) {
            return true;
        }

        if (PermissionAccess::canView($user, 'opportunities')) {
            return $user->employee && $opportunity->owner_id === $user->employee->id;
        }

        return false;
    }

    /**
     * Determine whether the user can assign the model.
     */
    public function assign(User $user, Opportunity $opportunity): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }

        return PermissionAccess::can($user, 'assign_opportunities');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Opportunity $opportunity): bool
    {
        if ($user->hasRole('client')) {
            return false;
        }
        return PermissionAccess::canDelete($user, 'opportunities');
    }
}

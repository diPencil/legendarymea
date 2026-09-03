<?php

namespace App\Policies;

use App\Models\User;
use App\Support\PermissionAccess;

class UserPolicy
{
    private function canViewUsers(User $user): bool
    {
        return PermissionAccess::canView($user, 'users');
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canViewUsers($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return $this->canViewUsers($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'users');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return PermissionAccess::canUpdate($user, 'users');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Don't allow users to delete themselves
        if ($user->id === $model->id) {
            return false;
        }
        return PermissionAccess::canDelete($user, 'users');
    }
}

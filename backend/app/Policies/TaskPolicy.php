<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Support\PermissionAccess;

class TaskPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'tasks');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        return PermissionAccess::canView($user, 'tasks');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'tasks');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        return PermissionAccess::canUpdate($user, 'tasks');
    }

    public function assign(User $user, Task $task): bool
    {
        return PermissionAccess::can($user, 'assign_tasks');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        return PermissionAccess::canDelete($user, 'tasks');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Task $task): bool
    {
        return PermissionAccess::canUpdate($user, 'tasks');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Task $task): bool
    {
        return PermissionAccess::canDelete($user, 'tasks');
    }
}

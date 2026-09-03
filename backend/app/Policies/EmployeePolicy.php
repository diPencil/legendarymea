<?php

namespace App\Policies;

use App\Models\Employee;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\Response;

class EmployeePolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'employees');
    }

    public function view(User $user, Employee $employee): bool
    {
        return PermissionAccess::canView($user, 'employees');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'employees');
    }

    public function update(User $user, Employee $employee): bool
    {
        return PermissionAccess::canUpdate($user, 'employees');
    }

    public function delete(User $user, Employee $employee): bool
    {
        return PermissionAccess::canDelete($user, 'employees');
    }

    public function restore(User $user, Employee $employee): bool
    {
        return PermissionAccess::canUpdate($user, 'employees');
    }

    public function forceDelete(User $user, Employee $employee): bool
    {
        return PermissionAccess::canDelete($user, 'employees');
    }
}

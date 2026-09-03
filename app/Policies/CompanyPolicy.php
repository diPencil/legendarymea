<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;
use App\Support\PermissionAccess;

class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'companies');
    }

    public function view(User $user, Company $company): bool
    {
        return PermissionAccess::canView($user, 'companies');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'companies');
    }

    public function update(User $user, Company $company): bool
    {
        return PermissionAccess::canUpdate($user, 'companies');
    }

    public function delete(User $user, Company $company): bool
    {
        return PermissionAccess::canDelete($user, 'companies');
    }

    public function restore(User $user, Company $company): bool
    {
        return PermissionAccess::canUpdate($user, 'companies');
    }

    public function forceDelete(User $user, Company $company): bool
    {
        return PermissionAccess::canDelete($user, 'companies');
    }
}

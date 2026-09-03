<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use App\Support\PermissionAccess;

class ContractPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'contracts');
    }

    public function view(User $user, Contract $contract): bool
    {
        return PermissionAccess::canView($user, 'contracts');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'contracts');
    }

    public function update(User $user, Contract $contract): bool
    {
        return PermissionAccess::canUpdate($user, 'contracts');
    }

    public function delete(User $user, Contract $contract): bool
    {
        return PermissionAccess::canDelete($user, 'contracts');
    }
}

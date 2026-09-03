<?php

namespace App\Policies;

use App\Models\Approval;
use App\Models\User;
use App\Support\PermissionAccess;

class ApprovalPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'approvals');
    }

    public function view(User $user, Approval $approval): bool
    {
        return PermissionAccess::canView($user, 'approvals');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'approvals');
    }

    public function update(User $user, Approval $approval): bool
    {
        return PermissionAccess::canUpdate($user, 'approvals');
    }

    public function delete(User $user, Approval $approval): bool
    {
        return PermissionAccess::canDelete($user, 'approvals');
    }

    public function restore(User $user, Approval $approval): bool
    {
        return PermissionAccess::canUpdate($user, 'approvals');
    }

    public function forceDelete(User $user, Approval $approval): bool
    {
        return PermissionAccess::canDelete($user, 'approvals');
    }

    public function decide(User $user, Approval $approval): bool
    {
        return PermissionAccess::can($user, 'approve_approvals', 'reject_approvals', 'decide_approvals');
    }
}

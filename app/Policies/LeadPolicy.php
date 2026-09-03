<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\Response;

class LeadPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'leads');
    }

    public function view(User $user, Lead $lead): bool
    {
        if (!PermissionAccess::canView($user, 'leads')) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin', 'manager'])) {
            return true;
        }

        return $lead->assigned_to === $user->employee?->id || $lead->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'leads');
    }

    public function update(User $user, Lead $lead): bool
    {
        if (!PermissionAccess::canUpdate($user, 'leads')) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin', 'manager'])) {
            return true;
        }

        return $lead->assigned_to === $user->employee?->id || $lead->created_by === $user->id;
    }

    public function delete(User $user, Lead $lead): bool
    {
        if (!PermissionAccess::canDelete($user, 'leads')) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin', 'manager'])) {
            return true;
        }

        return $lead->created_by === $user->id;
    }

    public function restore(User $user, Lead $lead): bool
    {
        return PermissionAccess::canUpdate($user, 'leads') && $user->hasRole(['super_admin', 'admin']);
    }

    public function forceDelete(User $user, Lead $lead): bool
    {
        return PermissionAccess::canDelete($user, 'leads') && $user->hasRole(['super_admin']);
    }

    public function convert(User $user, Lead $lead): bool
    {
        if (!PermissionAccess::can($user, 'convert_leads')) {
            return false;
        }

        if ($user->hasRole(['super_admin', 'admin', 'manager'])) {
            return true;
        }

        return $lead->assigned_to === $user->employee?->id || $lead->created_by === $user->id;
    }
}

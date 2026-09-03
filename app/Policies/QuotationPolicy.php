<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;
use App\Support\PermissionAccess;

class QuotationPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'quotations');
    }

    public function view(User $user, Quotation $quotation): bool
    {
        return PermissionAccess::canView($user, 'quotations');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'quotations');
    }

    public function update(User $user, Quotation $quotation): bool
    {
        return PermissionAccess::canUpdate($user, 'quotations');
    }

    public function delete(User $user, Quotation $quotation): bool
    {
        return PermissionAccess::canDelete($user, 'quotations');
    }

    public function restore(User $user, Quotation $quotation): bool
    {
        return PermissionAccess::canUpdate($user, 'quotations');
    }

    public function forceDelete(User $user, Quotation $quotation): bool
    {
        return PermissionAccess::canDelete($user, 'quotations');
    }
}

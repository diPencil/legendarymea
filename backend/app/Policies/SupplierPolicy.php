<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;
use App\Support\PermissionAccess;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'suppliers');
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return PermissionAccess::canView($user, 'suppliers');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'suppliers');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return PermissionAccess::canUpdate($user, 'suppliers');
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return PermissionAccess::canDelete($user, 'suppliers');
    }

    public function fund(User $user, Supplier $supplier): bool
    {
        return PermissionAccess::can($user, 'fund_supplier_balances');
    }
}

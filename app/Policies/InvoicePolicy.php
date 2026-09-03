<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\HandlesAuthorization;

class InvoicePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'invoices');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return PermissionAccess::canView($user, 'invoices');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'invoices');
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return PermissionAccess::canUpdate($user, 'invoices');
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return PermissionAccess::canDelete($user, 'invoices');
    }

    public function issue(User $user, Invoice $invoice): bool
    {
        return PermissionAccess::can($user, 'issue_invoices', 'manage_invoices');
    }

    public function cancel(User $user, Invoice $invoice): bool
    {
        return PermissionAccess::can($user, 'cancel_invoices', 'manage_invoices');
    }
}

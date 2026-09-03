<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Auth\Access\Response;

class ContactPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'contacts');
    }

    public function view(User $user, Contact $contact): bool
    {
        return PermissionAccess::canView($user, 'contacts');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'contacts');
    }

    public function update(User $user, Contact $contact): bool
    {
        return PermissionAccess::canUpdate($user, 'contacts');
    }

    public function delete(User $user, Contact $contact): bool
    {
        return PermissionAccess::canDelete($user, 'contacts');
    }

    public function restore(User $user, Contact $contact): bool
    {
        return PermissionAccess::canUpdate($user, 'contacts');
    }

    public function forceDelete(User $user, Contact $contact): bool
    {
        return PermissionAccess::canDelete($user, 'contacts');
    }
}

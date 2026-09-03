<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use App\Support\PermissionAccess;

class DocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'documents');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Document $document): bool
    {
        return PermissionAccess::canView($user, 'documents');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'documents');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Document $document): bool
    {
        return PermissionAccess::canUpdate($user, 'documents');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Document $document): bool
    {
        return PermissionAccess::canDelete($user, 'documents');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Document $document): bool
    {
        return PermissionAccess::canUpdate($user, 'documents');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Document $document): bool
    {
        return PermissionAccess::canDelete($user, 'documents');
    }
}

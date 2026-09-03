<?php

namespace App\Policies;

use App\Models\Inquiry;
use App\Models\User;
use App\Support\PermissionAccess;

class InquiryPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'inquiries');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Inquiry $inquiry): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'inquiries');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Inquiry $inquiry): bool
    {
        return PermissionAccess::canUpdate($user, 'inquiries');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Inquiry $inquiry): bool
    {
        return PermissionAccess::canDelete($user, 'inquiries');
    }
}

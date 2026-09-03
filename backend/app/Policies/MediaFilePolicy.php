<?php

namespace App\Policies;

use App\Models\MediaFile;
use App\Models\User;
use App\Support\PermissionAccess;

class MediaFilePolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'media');
    }

    public function view(User $user, MediaFile $mediaFile): bool
    {
        return PermissionAccess::canView($user, 'media');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'media');
    }

    public function update(User $user, MediaFile $mediaFile): bool
    {
        return PermissionAccess::canUpdate($user, 'media');
    }

    public function delete(User $user, MediaFile $mediaFile): bool
    {
        return PermissionAccess::canDelete($user, 'media');
    }
}

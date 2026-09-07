<?php

namespace App\Policies;

use App\Models\WebPage;
use App\Models\User;
use App\Support\PermissionAccess;

class WebPagePolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::can($user, 'view_website', 'manage_website');
    }

    public function view(User $user, WebPage $webPage): bool
    {
        return PermissionAccess::can($user, 'view_website', 'manage_website');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::can($user, 'manage_website');
    }

    public function update(User $user, WebPage $webPage): bool
    {
        return PermissionAccess::can($user, 'manage_website');
    }

    public function delete(User $user, WebPage $webPage): bool
    {
        return PermissionAccess::can($user, 'manage_website');
    }
}

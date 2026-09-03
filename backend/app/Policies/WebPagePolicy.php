<?php

namespace App\Policies;

use App\Models\WebPage;
use App\Models\User;

class WebPagePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage_website') || $user->hasPermissionTo('view_website');
    }

    public function view(User $user, WebPage $webPage): bool
    {
        return $user->hasPermissionTo('manage_website') || $user->hasPermissionTo('view_website');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage_website');
    }

    public function update(User $user, WebPage $webPage): bool
    {
        return $user->hasPermissionTo('manage_website');
    }

    public function delete(User $user, WebPage $webPage): bool
    {
        return $user->hasPermissionTo('manage_website');
    }
}

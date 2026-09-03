<?php

namespace App\Policies;

use App\Models\EmailMessage;
use App\Models\User;
use App\Support\PermissionAccess;

class EmailPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'emails');
    }

    public function view(User $user, EmailMessage $email): bool
    {
        return PermissionAccess::canView($user, 'emails');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'emails');
    }

    public function update(User $user, EmailMessage $email): bool
    {
        return PermissionAccess::canUpdate($user, 'emails') && $email->status === \App\Enums\EmailStatus::DRAFT;
    }

    public function delete(User $user, EmailMessage $email): bool
    {
        return PermissionAccess::canDelete($user, 'emails');
    }

    public function send(User $user, EmailMessage $email): bool
    {
        return PermissionAccess::can($user, 'send_emails');
    }
}

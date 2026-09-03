<?php

namespace App\Policies;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Support\PermissionAccess;

class EmailTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'email_templates') || PermissionAccess::can($user, 'manage_emails', 'manage_email_templates');
    }

    public function view(User $user, EmailTemplate $template): bool
    {
        return PermissionAccess::canCreate($user, 'email_templates') || PermissionAccess::can($user, 'manage_emails', 'manage_email_templates');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canView($user, 'email_templates') || PermissionAccess::can($user, 'manage_emails', 'manage_email_templates');
    }

    public function update(User $user, EmailTemplate $template): bool
    {
        return PermissionAccess::canUpdate($user, 'email_templates') || PermissionAccess::can($user, 'manage_emails', 'manage_email_templates');
    }

    public function delete(User $user, EmailTemplate $template): bool
    {
        return PermissionAccess::canDelete($user, 'email_templates') || PermissionAccess::can($user, 'manage_emails', 'manage_email_templates');
    }
}

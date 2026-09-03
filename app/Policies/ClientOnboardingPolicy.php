<?php

namespace App\Policies;

use App\Models\ClientOnboarding;
use App\Models\User;
use App\Support\PermissionAccess;

class ClientOnboardingPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'client_onboardings');
    }

    public function view(User $user, ClientOnboarding $clientOnboarding): bool
    {
        return PermissionAccess::canView($user, 'client_onboardings');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'client_onboardings');
    }

    public function update(User $user, ClientOnboarding $clientOnboarding): bool
    {
        return PermissionAccess::canUpdate($user, 'client_onboardings');
    }

    public function delete(User $user, ClientOnboarding $clientOnboarding): bool
    {
        return PermissionAccess::canDelete($user, 'client_onboardings');
    }
}

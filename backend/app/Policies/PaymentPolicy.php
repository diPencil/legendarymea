<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use App\Support\PermissionAccess;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::canView($user, 'payments');
    }

    public function view(User $user, Payment $payment): bool
    {
        return PermissionAccess::canView($user, 'payments');
    }

    public function create(User $user): bool
    {
        return PermissionAccess::canCreate($user, 'payments');
    }

    public function reverse(User $user, Payment $payment): bool
    {
        return PermissionAccess::can($user, 'reverse_payments', 'manage_payments');
    }
}

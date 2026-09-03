<?php

namespace App\Policies;

use App\Models\CareerApplication;
use App\Models\User;
use App\Support\PermissionAccess;

class CareerApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return PermissionAccess::can($user, 'view_career_applications', 'view_careers', 'manage_job_applications');
    }

    public function view(User $user, CareerApplication $careerApplication): bool
    {
        return PermissionAccess::can($user, 'view_career_applications', 'view_careers', 'manage_job_applications');
    }

    public function update(User $user, CareerApplication $careerApplication): bool
    {
        return PermissionAccess::can($user, 'update_career_applications', 'manage_job_applications');
    }

    public function delete(User $user, CareerApplication $careerApplication): bool
    {
        return PermissionAccess::can($user, 'delete_career_applications', 'manage_job_applications');
    }
}

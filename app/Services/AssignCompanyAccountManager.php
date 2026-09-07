<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Company;
use App\Models\Employee;
use App\Notifications\AccountManagerAssignedNotification;
use App\Support\PermissionAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignCompanyAccountManager
{
    public function execute(Company $company, ?int $employeeId): Company
    {
        return DB::transaction(function () use ($company, $employeeId) {
            $oldManagerId = $company->account_manager_id;
            
            if ($oldManagerId === $employeeId) {
                return $company;
            }

            if ($employeeId !== null) {
                $employee = Employee::find($employeeId);
                if (!$employee || $employee->status !== 'active' || !$employee->user || !PermissionAccess::hasRole($employee->user, 'manager')) {
                    throw ValidationException::withMessages([
                        'account_manager_id' => __('The selected account manager must be an active employee with the manager role.'),
                    ]);
                }
            } else {
                $employee = null;
            }

            $company->update(['account_manager_id' => $employeeId]);

            // Create Audit
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'account_manager_changed',
            module: 'Company',
            entity: $company,
            oldValues: ['account_manager_id' => $oldManagerId],
            newValues: ['account_manager_id' => $employeeId],
            metadata: [
                            'old_manager_id' => $oldManagerId,
                            'new_manager_id' => $employeeId
                        ]
        );

            // Notify
            if ($employee && $employee->user) {
                $employee->user->notify(new AccountManagerAssignedNotification($company));
            }

            return $company;
        });
    }
}

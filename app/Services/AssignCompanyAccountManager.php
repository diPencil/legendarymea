<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Company;
use App\Models\Employee;
use App\Notifications\AccountManagerAssignedNotification;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

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
                if (!$employee || $employee->status !== 'active') {
                    throw new InvalidArgumentException(__('Invalid or inactive account manager.'));
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

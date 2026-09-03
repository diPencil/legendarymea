<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Models\CrmActivity;
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
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'company.account_manager_changed',
                'subject_type' => Company::class,
                'subject_id' => $company->id,
                'old_values' => ['account_manager_id' => $oldManagerId],
                'new_values' => ['account_manager_id' => $employeeId],
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            // Create CRM Activity
            CrmActivity::create([
                'actor_id' => auth()->id(),
                'type' => 'company.account_manager_changed',
                'subject_type' => Company::class,
                'subject_id' => $company->id,
                'company_id' => $company->id,
                'metadata' => [
                    'old_manager_id' => $oldManagerId,
                    'new_manager_id' => $employeeId
                ],
            ]);

            // Notify
            if ($employee && $employee->user) {
                $employee->user->notify(new AccountManagerAssignedNotification($company));
            }

            return $company;
        });
    }
}

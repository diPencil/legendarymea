<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Employee;
use App\Enums\UserStatus;
use Illuminate\Validation\ValidationException;

class UpdateEmployeeService
{
    /**
     * Update an employee safely.
     */
    public function execute(Employee $employee, array $data): Employee
    {
        if (array_key_exists('manager_id', $data)) {
            $newManagerId = $data['manager_id'];
            
            if ($newManagerId !== null) {
                // Prevent self-management
                if ((int)$newManagerId === (int)$employee->id) {
                    throw ValidationException::withMessages([
                        'manager_id' => __('Employee cannot manage themselves.')
                    ]);
                }

                // Prevent hierarchy cycles
                $this->checkHierarchyCycle($employee->id, $newManagerId);
                $this->ensureValidManager((int) $newManagerId);
            }
        }

        $oldValues = $employee->getOriginal();
        
        $systemAccess = $data['system_access'] ?? null;
        if ($systemAccess === 'none') {
            $data['user_id'] = null;
        } elseif ($systemAccess === 'link') {
            $userId = $data['user_id'];
            $user = \App\Models\User::findOrFail($userId);
            
            if ($employee->user_id !== $userId && Employee::where('user_id', $userId)->exists()) {
                throw ValidationException::withMessages([
                    'user_id' => 'This user already has an employee profile.'
                ]);
            }
            if ($user->hasRole('client') && !$user->hasAnyRole(['employee', 'admin', 'super_admin'])) {
                throw ValidationException::withMessages([
                    'user_id' => 'A client user cannot be assigned as an employee.'
                ]);
            }
        } elseif ($systemAccess === 'create' || ($systemAccess === null && $employee->user_id)) {
            if (!$employee->user_id) {
                $password = \Illuminate\Support\Str::password(18);
                $user = \App\Models\User::create([
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'password' => \Illuminate\Support\Facades\Hash::make($password),
                    'status' => UserStatus::INVITED->value,
                    'must_change_password' => true,
                    'account_invite_status' => 'pending',
                ]);
                if (!empty($data['roles'])) {
                    $user->syncRoles($data['roles']);
                } else {
                    $user->assignRole('employee');
                }
                $data['user_id'] = $user->id;
                $newUserForInvite = $user;
                $newUserTemporaryPassword = $password;
            } else {
                $userUpdates = [];
                foreach (['name', 'username', 'email'] as $field) {
                    if (array_key_exists($field, $data)) {
                        $userUpdates[$field] = $data[$field];
                    }
                }
                if (isset($data['password']) && !empty($data['password'])) {
                    $userUpdates['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
                }
                if (!empty($userUpdates)) {
                    $employee->user->update($userUpdates);
                }
                if (isset($data['roles'])) {
                    $employee->user->syncRoles($data['roles']);
                }
                $data['user_id'] = $employee->user_id;
            }
        }
        
        foreach (['system_access', 'username', 'email', 'password', 'roles'] as $field) {
            unset($data[$field]);
        }
        
        if (array_key_exists('department', $data)) {
            $data['is_sales_eligible'] = $data['department'] === 'Sales';
        }
        
        $employee->update($data);
        $newValues = $employee->getChanges();

        if (!empty($newValues)) {
            $sensitiveFields = ['bank_account_number', 'national_address', 'identity_document_path'];
            $safeOldValues = collect($oldValues)->only(array_keys($newValues))->except($sensitiveFields)->toArray();
            $safeNewValues = collect($newValues)->except($sensitiveFields)->toArray();

            if (empty($safeNewValues)) {
                return $employee;
            }

            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Employee',
            entity: $employee,
            oldValues: $safeOldValues,
            newValues: $safeNewValues,
            metadata: []
        );
        }

        if (isset($newUserForInvite, $newUserTemporaryPassword)) {
            app(EmployeeAccountAccessService::class)->sendInvite($employee, $newUserForInvite, $newUserTemporaryPassword, auth()->user());
        }

        return $employee;
    }

    /**
     * Prevent A -> B -> A cycles recursively
     */
    protected function checkHierarchyCycle($employeeId, $managerId)
    {
        $currentManagerId = $managerId;
        $visited = [];

        while ($currentManagerId !== null) {
            if ($currentManagerId == $employeeId) {
                throw ValidationException::withMessages([
                    'manager_id' => __('Circular reporting chain detected.')
                ]);
            }
            
            if (in_array($currentManagerId, $visited)) {
                // Someone else's cycle detected, we still shouldn't link
                break;
            }
            $visited[] = $currentManagerId;

            $manager = Employee::find($currentManagerId);
            if (!$manager) {
                break;
            }

            $currentManagerId = $manager->manager_id;
        }
    }

    private function ensureValidManager(int $managerId): void
    {
        $isManager = Employee::query()
            ->whereKey($managerId)
            ->where('status', 'active')
            ->whereHas('user.roles', function ($query) {
                $query->whereRaw('LOWER(name) = ?', ['manager']);
            })
            ->exists();

        if (!$isManager) {
            throw ValidationException::withMessages([
                'manager_id' => __('The selected manager must be an active employee with the manager role.'),
            ]);
        }
    }
}

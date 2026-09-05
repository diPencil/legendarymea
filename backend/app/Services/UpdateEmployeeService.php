<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Employee;
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
                $user = \App\Models\User::create([
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
                    'status' => 'active'
                ]);
                if (!empty($data['roles'])) {
                    $user->syncRoles($data['roles']);
                } else {
                    $user->assignRole('employee');
                }
                $data['user_id'] = $user->id;
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
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Employee',
            entity: $employee,
            oldValues: collect($oldValues)->only(array_keys($newValues))->toArray(),
            newValues: $newValues,
            metadata: []
        );
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
}

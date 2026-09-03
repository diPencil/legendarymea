<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CreateEmployeeService
{
    protected ReferenceGeneratorService $referenceGenerator;

    public function __construct(ReferenceGeneratorService $referenceGenerator)
    {
        $this->referenceGenerator = $referenceGenerator;
    }

    /**
     * Create an employee safely.
     */
    public function execute(array $data): Employee
    {
        return DB::transaction(function () use ($data) {
            $userId = null;
            $systemAccess = $data['system_access'] ?? 'none';

            if ($systemAccess === 'link') {
                $userId = $data['user_id'];
                $user = User::findOrFail($userId);
                
                if (Employee::where('user_id', $userId)->exists()) {
                    throw ValidationException::withMessages([
                        'user_id' => 'This user already has an employee profile.'
                    ]);
                }
                
                if ($user->hasRole('client') && !$user->hasAnyRole(['employee', 'admin', 'super_admin'])) {
                    throw ValidationException::withMessages([
                        'user_id' => 'A client user cannot be assigned as an employee.'
                    ]);
                }
            } elseif ($systemAccess === 'create') {
                $user = User::create([
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'status' => 'active'
                ]);
                $userId = $user->id;
                
                if (!empty($data['roles'])) {
                    $user->syncRoles($data['roles']);
                } else {
                    $user->assignRole('employee');
                }
            }

            // Verify manager doesn't cause cycle (not possible on create since they have no reports, just need to ensure they don't manage themselves)
            // But they don't have an ID yet, so they can't manage themselves.
            // Just check manager exists.
            if (!empty($data['manager_id'])) {
                $manager = Employee::find($data['manager_id']);
                if (!$manager) {
                    throw ValidationException::withMessages([
                        'manager_id' => 'Invalid manager.'
                    ]);
                }
            }

            $employeeCode = $this->referenceGenerator->generate('LM-EMP-', 'employees', 'employee_code');

            $employee = Employee::create([
                'name' => $data['name'],
                'user_id' => $userId,
                'employee_code' => $employeeCode,
                'job_title' => $data['job_title'] ?? null,
                'department' => $data['department'] ?? null,
                'phone' => $data['phone'] ?? null,
                'country_code' => $data['country_code'] ?? null,
                'status' => $data['status'] ?? 'active',
                'is_sales_eligible' => isset($data['department']) && $data['department'] === 'Sales',
                'hire_date' => $data['hire_date'] ?? null,
                'manager_id' => $data['manager_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            \App\Models\AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'employee.created',
                'subject_type' => Employee::class,
                'subject_id' => $employee->id,
                'new_values' => collect($employee->toArray())->except(['password', 'remember_token'])->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);
            
            return $employee;
        });
    }
}

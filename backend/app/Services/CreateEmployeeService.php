<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
                $password = Str::password(18);
                $user = User::create([
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'password' => Hash::make($password),
                    'status' => 'invited',
                    'must_change_password' => true,
                    'account_invite_status' => 'pending',
                ]);
                $userId = $user->id;
                
                if (!empty($data['roles'])) {
                    $user->syncRoles($data['roles']);
                } else {
                    $user->assignRole('employee');
                }
            }

            if (!empty($data['manager_id'])) {
                $this->ensureValidManager((int) $data['manager_id']);
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
                'personal_email' => $data['personal_email'] ?? null,
                'bank_account_number' => $data['bank_account_number'] ?? null,
                'national_address' => $data['national_address'] ?? null,
                'status' => $data['status'] ?? 'active',
                'is_sales_eligible' => isset($data['department']) && $data['department'] === 'Sales',
                'hire_date' => $data['hire_date'] ?? null,
                'manager_id' => $data['manager_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Employee',
            entity: $employee,
            oldValues: [],
            newValues: collect($employee->toArray())->except([
                'password',
                'bank_account_number',
                'national_address',
                'identity_document_path',
            ])->toArray(),
            metadata: []
        );

            if (isset($user, $password) && $systemAccess === 'create') {
                \App\Services\SystemActivityService::record(
                    actor: auth()->user(),
                    action: 'employee_user_provisioned',
                    module: 'Employee',
                    entity: $employee,
                    oldValues: [],
                    newValues: ['user_id' => $user->id, 'email' => $user->email],
                    metadata: []
                );

                app(EmployeeAccountAccessService::class)->sendInvite($employee, $user, $password, auth()->user());
            }
            
            return $employee;
        });
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
                'manager_id' => 'The selected manager must be an active employee with the manager role.',
            ]);
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use Illuminate\Support\Facades\Gate;
use App\Http\Resources\EmployeeResource;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Employee::class);

        $query = Employee::with(['user', 'manager.user']);

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('job_title', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('department')) {
            $query->where('department', $request->input('department'));
        }
        if ($request->filled('manager_id')) {
            $query->where('manager_id', $request->input('manager_id'));
        }

        // Sorting
        $allowedSorts = ['employee_code', 'created_at', 'hire_date', 'status'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        
        $employees = $query->paginate($perPage);

        return EmployeeResource::collection($employees);
    }

    public function store(StoreEmployeeRequest $request, \App\Services\CreateEmployeeService $service)
    {
        Gate::authorize('create', Employee::class);

        $employee = $service->execute($request->validated());

        return (new EmployeeResource($employee->load(['user', 'manager.user'])))
            ->additional(['message' => __('Employee created successfully.')]);
    }

    public function show(Employee $employee)
    {
        Gate::authorize('view', $employee);

        return new EmployeeResource($employee->load(['user', 'manager.user']));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee, \App\Services\UpdateEmployeeService $service)
    {
        Gate::authorize('update', $employee);

        $employee = $service->execute($employee, $request->validated());

        return (new EmployeeResource($employee->load(['user', 'manager.user'])))
            ->additional(['message' => __('Employee updated successfully.')]);
    }

    public function destroy(Employee $employee)
    {
        Gate::authorize('delete', $employee);

        \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Employee',
            entity: $employee,
            oldValues: $employee->toArray(),
            newValues: [],
            metadata: []
        );

        $employee->delete();
        return response()->json([
            'message' => __('Employee deleted successfully.')
        ]);
    }
}

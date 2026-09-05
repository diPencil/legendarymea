<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignTaskRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Support\PermissionAccess;
use App\Services\AssignTaskService;
use App\Services\CreateTaskService;
use App\Services\UpdateTaskService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Task::class);

        $query = Task::with(['company', 'contact', 'lead', 'opportunity', 'request', 'assignee.user', 'creator']);

        $user = $request->user();
        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'tasks')) {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->employee?->id)
                    ->orWhere('created_by', $user->id);
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $filters = ['status', 'priority', 'company_id', 'contact_id', 'lead_id', 'opportunity_id', 'request_id', 'assigned_to'];
        foreach ($filters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('due_from')) {
            $query->whereDate('due_at', '>=', $request->input('due_from'));
        }
        if ($request->filled('due_to')) {
            $query->whereDate('due_at', '<=', $request->input('due_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortWhitelist = ['reference', 'title', 'status', 'priority', 'due_at', 'created_at', 'updated_at', 'completed_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return TaskResource::collection($query->paginate($perPage));
    }

    public function store(StoreTaskRequest $request, CreateTaskService $service)
    {
        $this->authorize('create', Task::class);

        $task = $service->execute($request->validated(), $request->user()->id);
        $task->load(['company', 'contact', 'lead', 'opportunity', 'request', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Task created',
            'data' => new TaskResource($task),
        ], 201);
    }

    public function show(Task $task)
    {
        $this->authorize('view', $task);
        $this->authorizeEmployeeScope($task);

        $task->load(['company', 'contact', 'lead', 'opportunity', 'request', 'assignee.user', 'creator']);

        return new TaskResource($task);
    }

    public function update(UpdateTaskRequest $request, Task $task, UpdateTaskService $service)
    {
        $this->authorize('update', $task);

        $task = $service->execute($task, $request->validated(), $request->user()->id);
        $task->load(['company', 'contact', 'lead', 'opportunity', 'request', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Task updated',
            'data' => new TaskResource($task),
        ]);
    }

    public function destroy(Task $task)
    {
        $this->authorize('delete', $task);

        $oldData = array_intersect_key($task->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'assigned_to',
            'title',
            'description',
            'status',
            'priority',
            'due_at',
            'started_at',
            'completed_at',
            'created_by',
        ]));

        $task->delete();

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Task',
            entity: $task,
            oldValues: $oldData,
            newValues: null,
            metadata: [
                        'task_id' => $task->id,
                        'task_reference' => $task->reference,
                    ]
        );

        return response()->json(['message' => 'Task deleted']);
    }

    public function assign(AssignTaskRequest $request, Task $task, AssignTaskService $service)
    {
        $this->authorize('assign', $task);

        $employeeId = $request->input('assigned_to');
        if ($employeeId !== null) {
            $employeeId = (int)$employeeId;
        }

        $task = $service->execute(
            $task,
            $employeeId,
            $request->user()->id
        );
        $task->load(['company', 'contact', 'lead', 'opportunity', 'request', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Task assigned',
            'data' => new TaskResource($task),
        ]);
    }

    private function authorizeEmployeeScope(Task $task): void
    {
        $user = auth()->user();

        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'tasks')) {
            abort_unless(
                $task->assigned_to === $user->employee?->id || $task->created_by === $user->id,
                403
            );
        }
    }
}

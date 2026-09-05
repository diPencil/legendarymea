<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\TaskStatus;
use App\Models\Employee;
use App\Models\Task;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Support\Facades\DB;

class AssignTaskService
{
    public function execute(Task $task, ?int $employeeId, int $assignedBy): Task
    {
        return DB::transaction(function () use ($task, $employeeId, $assignedBy) {
            $oldAssigneeId = $task->assigned_to;

            if ($oldAssigneeId === $employeeId) {
                return $task;
            }

            $oldData = $this->auditValues($task);
            $data = ['assigned_to' => $employeeId];

            $task->update($data);
            $task->refresh();

            $type = $employeeId ? ($oldAssigneeId ? 'task.reassigned' : 'task.assigned') : 'task.unassigned';

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Task',
            entity: $task,
            oldValues: $oldData,
            newValues: $this->auditValues($task),
            metadata: [
                            'task_id' => $task->id,
                            'task_reference' => $task->reference,
                            'old_assigned_to' => $oldAssigneeId,
                            'new_assigned_to' => $employeeId,
                            'status' => $task->status?->value,
                        ]
        );

            if ($employeeId) {
                $employee = Employee::with('user')->find($employeeId);
                if ($employee?->user) {
                    $employee->user->notify(new TaskAssignedNotification($task));
                }
            }

            return $task->fresh();
        });
    }

    private function auditValues(Task $task): array
    {
        return array_intersect_key($task->toArray(), array_flip([
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
    }
}

<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Employee;
use App\Models\FollowUp;
use App\Notifications\FollowUpAssignedNotification;
use Illuminate\Support\Facades\DB;

class AssignFollowUpService
{
    public function execute(FollowUp $followUp, ?int $employeeId, int $assignedBy): FollowUp
    {
        return DB::transaction(function () use ($followUp, $employeeId, $assignedBy) {
            $oldAssigneeId = $followUp->assigned_to;

            if ($oldAssigneeId === $employeeId) {
                return $followUp;
            }

            $oldData = $this->auditValues($followUp);
            $data = ['assigned_to' => $employeeId];

            $followUp->update($data);
            $followUp->refresh();

            $type = $employeeId ? ($oldAssigneeId ? 'follow_up.reassigned' : 'follow_up.assigned') : 'follow_up.unassigned';

            AuditLog::create([
                'user_id' => $assignedBy,
                'action' => $type,
                'subject_type' => FollowUp::class,
                'subject_id' => $followUp->id,
                'old_values' => $oldData,
                'new_values' => $this->auditValues($followUp),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $assignedBy,
                'type' => $type,
                'subject_type' => FollowUp::class,
                'subject_id' => $followUp->id,
                'company_id' => $followUp->company_id,
                'metadata' => [
                    'follow_up_id' => $followUp->id,
                    'follow_up_reference' => $followUp->reference,
                    'old_assigned_to' => $oldAssigneeId,
                    'new_assigned_to' => $employeeId,
                    'status' => $followUp->status?->value,
                ],
            ]);

            if ($employeeId) {
                $employee = Employee::with('user')->find($employeeId);
                if ($employee?->user) {
                    $employee->user->notify(new FollowUpAssignedNotification($followUp));
                }
            }

            return $followUp->fresh();
        });
    }

    private function auditValues(FollowUp $followUp): array
    {
        return array_intersect_key($followUp->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'task_id',
            'assigned_to',
            'title',
            'notes',
            'status',
            'follow_up_at',
            'completed_at',
            'created_by',
        ]));
    }
}

<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Employee;
use App\Models\Request;
use App\Notifications\RequestAssignedNotification;
use Illuminate\Support\Facades\DB;

class AssignRequestService
{
    public function execute(Request $request, int $employeeId, int $assignedBy): Request
    {
        return DB::transaction(function () use ($request, $employeeId, $assignedBy) {
            $oldAssigneeId = $request->assigned_to;

            if ($oldAssigneeId === $employeeId) {
                return $request;
            }

            $oldData = $this->auditValues($request);
            $data = ['assigned_to' => $employeeId];

            if ($oldAssigneeId === null && $request->status === RequestStatus::NEW) {
                $data['status'] = RequestStatus::ASSIGNED->value;
            }

            $request->update($data);
            $request->refresh();

            $type = $oldAssigneeId ? 'request.reassigned' : 'request.assigned';

            AuditLog::create([
                'user_id' => $assignedBy,
                'action' => 'request.assigned',
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'old_values' => $oldData,
                'new_values' => $this->auditValues($request),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $assignedBy,
                'type' => $type,
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'company_id' => $request->company_id,
                'metadata' => [
                    'request_id' => $request->id,
                    'request_reference' => $request->reference,
                    'old_assigned_to' => $oldAssigneeId,
                    'new_assigned_to' => $employeeId,
                    'status' => $request->status?->value,
                ],
            ]);

            $employee = Employee::with('user')->find($employeeId);
            if ($employee?->user) {
                $employee->user->notify(new RequestAssignedNotification($request));
            }

            return $request->fresh();
        });
    }

    private function auditValues(Request $request): array
    {
        return array_intersect_key($request->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'opportunity_id',
            'assigned_to',
            'title',
            'service_interest',
            'status',
            'priority',
            'due_at',
            'started_at',
            'completed_at',
            'created_by',
        ]));
    }
}

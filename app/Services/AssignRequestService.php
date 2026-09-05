<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\RequestStatus;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: $type,
            module: 'Request',
            entity: $request,
            oldValues: $oldData,
            newValues: $this->auditValues($request),
            metadata: [
                            'request_id' => $request->id,
                            'request_reference' => $request->reference,
                            'old_assigned_to' => $oldAssigneeId,
                            'new_assigned_to' => $employeeId,
                            'status' => $request->status?->value,
                        ]
        );

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

<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\User;
use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Notifications\ApprovalAssignedNotification;
use Illuminate\Validation\ValidationException;

class AssignApprovalService
{
    public function execute(Approval $approval, array $data, User $actor): Approval
    {
        if ($approval->status !== ApprovalStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Only pending approvals can be assigned.'
            ]);
        }

        $newAssigneeId  = $data['assigned_to'] ?? null;
        $prevAssigneeId = $approval->assigned_to;

        if ($newAssigneeId === $approval->requested_by) {
            throw ValidationException::withMessages([
                'assigned_to' => 'The requester cannot be assigned to their own approval.'
            ]);
        }

        $approval->assigned_to = $newAssigneeId;
        $approval->save();

        if ($newAssigneeId) {
            AuditLog::create([
                'user_id'         => $actor->id,
                'action'          => 'approval.assigned',
                'subject_type'    => Approval::class,
                'subject_id'      => $approval->id,
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            // Notify the new assignee only when the assignee actually changed
            if ($newAssigneeId !== $prevAssigneeId) {
                $assignee = User::find($newAssigneeId);
                // Avoid self-notification (actor assigned themselves — blocked by business rule but guard here too)
                if ($assignee && $assignee->id !== $actor->id) {
                    $assignee->notify(new ApprovalAssignedNotification($approval));
                }
            }
        } else {
            AuditLog::create([
                'user_id'         => $actor->id,
                'action'          => 'approval.unassigned',
                'subject_type'    => Approval::class,
                'subject_id'      => $approval->id,
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);
            // No notification on unassign (null target)
        }

        return $approval;
    }
}

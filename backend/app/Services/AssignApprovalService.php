<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Approval;
use App\Models\User;
use App\Enums\ApprovalStatus;
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
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'assigned',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: []
        );

            // Notify the new assignee only when the assignee actually changed
            if ($newAssigneeId !== $prevAssigneeId) {
                $assignee = User::find($newAssigneeId);
                // Avoid self-notification (actor assigned themselves — blocked by business rule but guard here too)
                if ($assignee && $assignee->id !== $actor->id) {
                    $assignee->notify(new ApprovalAssignedNotification($approval));
                }
            }
        } else {
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'unassigned',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: []
        );
            // No notification on unassign (null target)
        }

        return $approval;
    }
}

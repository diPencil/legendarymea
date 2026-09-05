<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Approval;
use App\Models\User;
use App\Enums\ApprovalStatus;
use App\Notifications\ApprovalApprovedNotification;
use App\Notifications\ApprovalCancelledNotification;
use App\Notifications\ApprovalRejectedNotification;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class ApprovalDecisionService
{
    public function approve(Approval $approval, array $data, User $actor): Approval
    {
        return $this->processDecision($approval, ApprovalStatus::APPROVED, $data, $actor);
    }

    public function reject(Approval $approval, array $data, User $actor): Approval
    {
        return $this->processDecision($approval, ApprovalStatus::REJECTED, $data, $actor);
    }

    public function cancel(Approval $approval, User $actor): Approval
    {
        if ($approval->status !== ApprovalStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Only pending approvals can be cancelled.'
            ]);
        }

        // Capture assignee before saving (for notification after state change)
        $assigneeId = $approval->assigned_to;

        $approval->status     = ApprovalStatus::CANCELLED;
        $approval->decided_by = null;
        $approval->decided_at = null;
        $approval->save();

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'cancelled',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: [
                        'quotation_id'        => $approval->quotation->id,
                        'quotation_reference' => $approval->quotation->reference,
                    ]
        );

        // Notify the assignee that the approval was withdrawn — avoid self-notification
        if ($assigneeId && $assigneeId !== $actor->id) {
            $assignee = User::find($assigneeId);
            if ($assignee) {
                $assignee->notify(new ApprovalCancelledNotification($approval));
            }
        }

        return $approval;
    }

    private function processDecision(Approval $approval, ApprovalStatus $newStatus, array $data, User $actor): Approval
    {
        if ($approval->status !== ApprovalStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Decision can only be made on pending approvals.'
            ]);
        }

        if ($approval->requested_by === $actor->id) {
            throw ValidationException::withMessages([
                'decided_by' => 'You cannot decide your own approval request.'
            ]);
        }

        if ($approval->assigned_to && $approval->assigned_to !== $actor->id) {
            throw ValidationException::withMessages([
                'decided_by' => 'Only the assigned user can make a decision on this approval.'
            ]);
        }

        return DB::transaction(function () use ($approval, $newStatus, $data, $actor) {
            $approval->status        = $newStatus;
            $approval->decision_note = $data['decision_note'] ?? null;
            $approval->decided_by    = $actor->id;
            $approval->decided_at    = now();
            $approval->save();

            $statusText = $newStatus === ApprovalStatus::APPROVED ? 'approved' : 'rejected';
            $action     = 'approval.' . $statusText;

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: [
                            'quotation_id'        => $approval->quotation->id,
                            'quotation_reference' => $approval->quotation->reference,
                        ]
        );

            // Notify the requester of the decision — avoid self-notification
            $requesterId = $approval->requested_by;
            if ($requesterId && $requesterId !== $actor->id) {
                $requester = User::find($requesterId);
                if ($requester) {
                    $notification = $newStatus === ApprovalStatus::APPROVED
                        ? new ApprovalApprovedNotification($approval)
                        : new ApprovalRejectedNotification($approval);

                    $requester->notify($notification);
                }
            }

            return $approval;
        });
    }
}

<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ApprovalStatus;
use App\Enums\QuotationStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Notifications\ApprovalAssignedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Events\ApprovalCreated; // Will use generic Activity logging if no explicit event

class CreateApprovalService
{
    public function execute(array $data, User $requester): Approval
    {
        return DB::transaction(function () use ($data, $requester) {
            $quotation = Quotation::findOrFail($data['quotation_id']);

            if ($quotation->status !== QuotationStatus::DRAFT) {
                throw ValidationException::withMessages([
                    'quotation_id' => 'Approvals can only be requested for DRAFT quotations.'
                ]);
            }

            $hasPending = $quotation->approvals()->where('status', ApprovalStatus::PENDING)->exists();
            if ($hasPending) {
                throw ValidationException::withMessages([
                    'quotation_id' => 'This quotation already has an active pending approval request.'
                ]);
            }

            if (isset($data['assigned_to']) && $data['assigned_to'] === $requester->id) {
                throw ValidationException::withMessages([
                    'assigned_to' => 'You cannot assign an approval request to yourself.'
                ]);
            }

            $year = date('Y');
            $latest = Approval::whereYear('created_at', $year)->lockForUpdate()->latest('id')->first();
            $sequence = $latest ? intval(substr($latest->reference, -6)) + 1 : 1;
            $reference = sprintf("LM-APR-%s-%06d", $year, $sequence);

            $approval = Approval::create([
                'reference' => $reference,
                'quotation_id' => $quotation->id,
                'status' => ApprovalStatus::PENDING,
                'requested_by' => $requester->id,
                'assigned_to' => $data['assigned_to'] ?? null,
                'request_note' => $data['request_note'] ?? null,
                'requested_at' => now(),
            ]);

            AuditLog::create([
                'user_id' => $requester->id,
                'action' => 'approval.requested',
                'subject_type' => Approval::class,
                'subject_id' => $approval->id,
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $requester->id,
                'type' => 'approval.requested',
                'subject_type' => Approval::class,
                'subject_id' => $approval->id,
                'company_id' => $quotation->company_id,
                'metadata' => [
                    'quotation_id' => $quotation->id,
                    'quotation_reference' => $quotation->reference,
                ],
            ]);

            if ($approval->assigned_to) {
                AuditLog::create([
                    'user_id' => $requester->id,
                    'action' => 'approval.assigned',
                    'subject_type' => Approval::class,
                    'subject_id' => $approval->id,
                    'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
                ]);

                // Notify the assignee — requester !== assignee is already enforced above
                $assignee = User::find($approval->assigned_to);
                if ($assignee) {
                    $assignee->notify(new ApprovalAssignedNotification($approval));
                }
            }

            return $approval;
        });
    }
}

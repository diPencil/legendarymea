<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Approval;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ApprovalStatus;
use App\Enums\QuotationStatus;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'requested',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: [
                            'quotation_id' => $quotation->id,
                            'quotation_reference' => $quotation->reference,
                        ]
        );

            if ($approval->assigned_to) {
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'assigned',
            module: 'Approval',
            entity: $approval,
            oldValues: [],
            newValues: [],
            metadata: []
        );

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

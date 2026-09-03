<?php

namespace App\Services;

use App\Enums\QuotationStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Quotation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuotationLifecycleService
{
    /**
     * Allowed transitions map.
     */
    private const ALLOWED_TRANSITIONS = [
        'draft'  => ['sent', 'cancelled'],
        'sent'   => ['accepted', 'rejected', 'cancelled', 'expired'],
        // accepted, rejected, expired, cancelled are terminal
    ];

    public function transition(Quotation $quotation, string $toStatus, int $actorId): Quotation
    {
        $fromStatus = $quotation->status->value;

        $allowed = self::ALLOWED_TRANSITIONS[$fromStatus] ?? [];
        if (!in_array($toStatus, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition quotation from '{$fromStatus}' to '{$toStatus}'."],
            ]);
        }

        if (in_array($toStatus, ['sent', 'cancelled'])) {
            $hasPendingApproval = $quotation->approvals()->where('status', 'pending')->exists();
            if ($hasPendingApproval) {
                throw ValidationException::withMessages([
                    'status' => ['Cannot modify quotation while it has a pending approval request.'],
                ]);
            }
        }

        return DB::transaction(function () use ($quotation, $fromStatus, $toStatus, $actorId) {
            $updateData = ['status' => $toStatus];

            // When sending, set issue_date if not already set
            if ($toStatus === 'sent' && !$quotation->issue_date) {
                $updateData['issue_date'] = now()->toDateString();
            }

            $quotation->update($updateData);
            $quotation->refresh();

            $action = "quotation.{$toStatus}";

            AuditLog::create([
                'user_id'         => $actorId,
                'action'          => $action,
                'subject_type'    => Quotation::class,
                'subject_id'      => $quotation->id,
                'old_values'      => ['status' => $fromStatus],
                'new_values'      => ['status' => $toStatus],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id'     => $actorId,
                'type'         => $action,
                'subject_type' => Quotation::class,
                'subject_id'   => $quotation->id,
                'company_id'   => $quotation->company_id,
                'metadata'     => [
                    'quotation_id'        => $quotation->id,
                    'quotation_reference' => $quotation->reference,
                    'from_status'         => $fromStatus,
                    'to_status'           => $toStatus,
                ],
            ]);

            return $quotation;
        });
    }
}

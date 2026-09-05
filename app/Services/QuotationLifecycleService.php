<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\QuotationStatus;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: $toStatus,
            module: 'Quotation',
            entity: $quotation,
            oldValues: ['status' => $fromStatus],
            newValues: ['status' => $toStatus],
            metadata: [
                            'quotation_id'        => $quotation->id,
                            'quotation_reference' => $quotation->reference,
                            'from_status'         => $fromStatus,
                            'to_status'           => $toStatus,
                        ]
        );

            return $quotation;
        });
    }
}

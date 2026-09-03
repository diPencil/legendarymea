<?php

namespace App\Services;

use App\Models\Opportunity;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use App\Notifications\OpportunityAssignedNotification;
use Illuminate\Support\Facades\Auth;

class AssignOpportunityService
{
    public function execute(Opportunity $opportunity, int $newOwnerId, ?int $assignedBy = null): Opportunity
    {
        return DB::transaction(function () use ($opportunity, $newOwnerId, $assignedBy) {
            $oldOwnerId = $opportunity->owner_id;
            
            if ($oldOwnerId === $newOwnerId) {
                return $opportunity;
            }

            $oldData = $opportunity->toArray();
            $opportunity->update(['owner_id' => $newOwnerId]);

            $type = $oldOwnerId ? 'opportunity.reassigned' : 'opportunity.assigned';

            AuditLog::create([
                'user_id' => $assignedBy,
                'action' => $type,
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'old_values' => $oldData,
                'new_values' => $opportunity->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent()
                ]
            ]);

            CrmActivity::create([
                'actor_id' => $assignedBy,
                'type' => $type,
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'company_id' => $opportunity->company_id,
                'metadata' => [
                    'opportunity_id' => $opportunity->id,
                    'old_owner_id' => $oldOwnerId,
                    'new_owner_id' => $newOwnerId,
                ],
            ]);

            $newOwner = Employee::find($newOwnerId);
            if ($newOwner && $newOwner->user) {
                $newOwner->user->notify(new OpportunityAssignedNotification($opportunity));
            }

            return $opportunity;
        });
    }
}

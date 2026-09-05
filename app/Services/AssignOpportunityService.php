<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Opportunity;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: $type,
            module: 'Opportunity',
            entity: $opportunity,
            oldValues: $oldData,
            newValues: $opportunity->toArray(),
            metadata: [
                            'opportunity_id' => $opportunity->id,
                            'old_owner_id' => $oldOwnerId,
                            'new_owner_id' => $newOwnerId,
                        ]
        );

            $newOwner = Employee::find($newOwnerId);
            if ($newOwner && $newOwner->user) {
                $newOwner->user->notify(new OpportunityAssignedNotification($opportunity));
            }

            return $opportunity;
        });
    }
}

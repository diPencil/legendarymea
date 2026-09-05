<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Opportunity;
use Illuminate\Support\Facades\DB;
use App\Enums\OpportunityStage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ChangeOpportunityStageService
{
    public function execute(Opportunity $opportunity, string $newStage, ?string $lostReason = null, ?int $updatedBy = null): Opportunity
    {
        return DB::transaction(function () use ($opportunity, $newStage, $lostReason, $updatedBy) {
            $oldStage = $opportunity->stage->value;
            if ($oldStage === $newStage) {
                return $opportunity;
            }

            $oldData = $opportunity->toArray();
            $data = ['stage' => $newStage];
            
            $type = 'opportunity.stage_changed';
            $isReopened = false;
            
            if (in_array($oldStage, [OpportunityStage::WON->value, OpportunityStage::LOST->value]) && 
                !in_array($newStage, [OpportunityStage::WON->value, OpportunityStage::LOST->value])) {
                $isReopened = true;
                $data['closed_at'] = null;
                $data['lost_reason'] = null;
                $type = 'opportunity.reopened';
            }

            if ($newStage === OpportunityStage::WON->value) {
                $data['closed_at'] = Carbon::now();
                $data['lost_reason'] = null;
                $type = 'opportunity.won';
            } elseif ($newStage === OpportunityStage::LOST->value) {
                $data['closed_at'] = Carbon::now();
                $data['lost_reason'] = $lostReason;
                $type = 'opportunity.lost';
            } elseif (!$isReopened) {
                $data['lost_reason'] = null;
            }

            $opportunity->update($data);

            SystemActivityService::record(
            actor: auth()->user(),
            action: $type,
            module: 'Opportunity',
            entity: $opportunity,
            oldValues: $oldData,
            newValues: $opportunity->toArray(),
            metadata: [
                            'opportunity_id' => $opportunity->id,
                            'old_stage' => $oldStage,
                            'new_stage' => $newStage,
                            'lost_reason' => $lostReason,
                        ]
        );

            return $opportunity;
        });
    }
}

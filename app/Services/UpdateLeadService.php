<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class UpdateLeadService
{
    public function execute(Lead $lead, array $data): Lead
    {
        return DB::transaction(function () use ($lead, $data) {
            $oldValues = $lead->toArray();
            unset($data['assigned_to']);
            
            $lead->update($data);

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Lead',
            entity: $lead,
            oldValues: $oldValues,
            newValues: $lead->toArray(),
            metadata: [
                            'lead_reference' => $lead->reference,
                        ]
        );

            return $lead->fresh();
        });
    }
}

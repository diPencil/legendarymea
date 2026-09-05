<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Lead;
use App\Models\Employee;
use App\Notifications\LeadAssignedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AssignLeadService
{
    public function execute(Lead $lead, array $data): Lead
    {
        return DB::transaction(function () use ($lead, $data) {
            $oldValues = $lead->toArray();
            
            $lead->update(['assigned_to' => $data['assigned_to']]);

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'assigned',
            module: 'Lead',
            entity: $lead,
            oldValues: $oldValues,
            newValues: $lead->toArray(),
            metadata: [
                            'lead_reference' => $lead->reference,
                            'assigned_to' => $data['assigned_to']
                        ]
        );

            $employee = Employee::find($data['assigned_to']);
            if ($employee && $employee->user) {
                $employee->user->notify(new LeadAssignedNotification($lead));
            }

            return $lead->fresh();
        });
    }
}

<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Employee;
use App\Models\CrmActivity;
use App\Models\AuditLog;
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

            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'lead.assigned',
                'subject_type' => Lead::class,
                'subject_id' => $lead->id,
                'old_values' => $oldValues,
                'new_values' => $lead->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ]
            ]);

            CrmActivity::create([
                'company_id' => $lead->company_id,
                'actor_id' => Auth::id(),
                'subject_type' => Lead::class,
                'subject_id' => $lead->id,
                'type' => 'lead.assigned',
                'metadata' => [
                    'lead_reference' => $lead->reference,
                    'assigned_to' => $data['assigned_to']
                ],
            ]);

            $employee = Employee::find($data['assigned_to']);
            if ($employee && $employee->user) {
                $employee->user->notify(new LeadAssignedNotification($lead));
            }

            return $lead->fresh();
        });
    }
}

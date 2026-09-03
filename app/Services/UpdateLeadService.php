<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\CrmActivity;
use App\Models\AuditLog;
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

            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'lead.updated',
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
                'type' => 'lead.updated',
                'metadata' => [
                    'lead_reference' => $lead->reference,
                ],
            ]);

            return $lead->fresh();
        });
    }
}

<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\CrmActivity;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class CreateLeadService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGeneratorService
    ) {}

    public function execute(array $data): Lead
    {
        return DB::transaction(function () use ($data) {
            $data['reference'] = $this->referenceGeneratorService->generate('LM-LEAD-' . date('Y'), 'leads', 'reference', 6);
            $data['created_by'] = Auth::id();
            
            $lead = Lead::create($data);

            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'lead.created',
                'subject_type' => Lead::class,
                'subject_id' => $lead->id,
                'old_values' => null,
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
                'type' => 'lead.created',
                'metadata' => [
                    'lead_reference' => $lead->reference,
                ],
            ]);

            return $lead;
        });
    }
}

<?php

namespace App\Services;

use App\Models\Opportunity;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use Illuminate\Support\Facades\DB;
use App\Enums\OpportunityStage;
use Illuminate\Support\Facades\Auth;

class CreateOpportunityService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, ?int $createdBy = null): Opportunity
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $data['reference'] = $this->referenceGenerator->generate('LM-OPP-' . date('Y'), 'opportunities', 'reference', 6);
            $data['created_by'] = $createdBy;
            $data['stage'] = $data['stage'] ?? OpportunityStage::QUALIFICATION->value;

            $opportunity = Opportunity::create($data);

            AuditLog::create([
                'user_id' => $createdBy,
                'action' => 'opportunity.created',
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'old_values' => null,
                'new_values' => $opportunity->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent()
                ]
            ]);

            CrmActivity::create([
                'actor_id' => $createdBy,
                'type' => 'opportunity.created',
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'company_id' => $opportunity->company_id,
                'metadata' => [
                    'opportunity_id' => $opportunity->id,
                    'stage' => $opportunity->stage->value,
                ],
            ]);

            return $opportunity;
        });
    }
}

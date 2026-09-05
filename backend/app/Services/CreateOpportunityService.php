<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Opportunity;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Opportunity',
            entity: $opportunity,
            oldValues: null,
            newValues: $opportunity->toArray(),
            metadata: [
                            'opportunity_id' => $opportunity->id,
                            'stage' => $opportunity->stage->value,
                        ]
        );

            return $opportunity;
        });
    }
}

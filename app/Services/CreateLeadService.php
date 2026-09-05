<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Lead;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Lead',
            entity: $lead,
            oldValues: null,
            newValues: $lead->toArray(),
            metadata: [
                            'lead_reference' => $lead->reference,
                        ]
        );

            return $lead;
        });
    }
}

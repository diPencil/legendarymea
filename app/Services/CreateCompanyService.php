<?php

namespace App\Services;

use App\Models\Company;
use App\Services\SystemActivityService;
use Illuminate\Support\Facades\DB;

class CreateCompanyService
{
    protected ReferenceGeneratorService $referenceGenerator;

    public function __construct(ReferenceGeneratorService $referenceGenerator)
    {
        $this->referenceGenerator = $referenceGenerator;
    }

    public function execute(array $data): Company
    {
        return DB::transaction(function () use ($data) {
            $data['reference'] = $this->referenceGenerator->generate('LM-CMP-' . date('Y') . '-', 'companies', 'reference', 6);
            $data['created_by'] = auth()->id();

            // Extract relationships
            $relationships = $data['relationship_types'] ?? ['lead'];
            unset($data['relationship_types']);
            
            $accountManagerId = $data['account_manager_id'] ?? null;
            unset($data['account_manager_id']);

            $company = Company::create($data);

            foreach ($relationships as $type) {
                $company->companyRelationships()->create(['type' => $type]);
            }

            // Create Audit and CRM Activity
            SystemActivityService::record(
                actor: auth()->user(),
                action: 'created',
                module: 'Company',
                entity: $company,
                oldValues: [],
                newValues: $company->toArray(),
                metadata: [
                    'relationships' => $relationships,
                ]
            );

            // If account manager assigned at creation
            if (!empty($accountManagerId)) {
                app(AssignCompanyAccountManager::class)->execute($company, $accountManagerId);
            }

            return $company;
        });
    }
}

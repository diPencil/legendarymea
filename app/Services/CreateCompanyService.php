<?php

namespace App\Services;

use App\Models\Company;
use App\Models\AuditLog;
use App\Models\CrmActivity;
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

            // Create Audit
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'company.created',
                'subject_type' => Company::class,
                'subject_id' => $company->id,
                'new_values' => $company->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            // Create CRM Activity
            CrmActivity::create([
                'actor_id' => auth()->id(),
                'type' => 'company.created',
                'subject_type' => Company::class,
                'subject_id' => $company->id,
                'company_id' => $company->id,
                'metadata' => [
                    'relationships' => $relationships,
                ],
            ]);

            // If account manager assigned at creation
            if (!empty($accountManagerId)) {
                app(AssignCompanyAccountManager::class)->execute($company, $accountManagerId);
            }

            return $company;
        });
    }
}

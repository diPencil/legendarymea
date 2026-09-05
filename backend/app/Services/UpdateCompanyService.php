<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\Company;
use Illuminate\Support\Facades\DB;

class UpdateCompanyService
{
    public function execute(Company $company, array $data): Company
    {
        return DB::transaction(function () use ($company, $data) {
            $oldValues = $company->toArray();

            $relationships = $data['relationship_types'] ?? null;
            unset($data['relationship_types']);
            
            $accountManagerId = $data['account_manager_id'] ?? null;
            $hasAccountManager = array_key_exists('account_manager_id', $data);
            unset($data['account_manager_id']);

            $company->update($data);

            if ($relationships !== null) {
                // Synchronize relationships
                $existingTypes = $company->companyRelationships()->pluck('type')->toArray();
                
                $toAdd = array_diff($relationships, $existingTypes);
                $toRemove = array_diff($existingTypes, $relationships);

                if (!empty($toRemove)) {
                    $company->companyRelationships()->whereIn('type', $toRemove)->delete();
                    SystemActivityService::record(
            actor: auth()->user(),
            action: 'relationship_removed',
            module: 'Company',
            entity: $company,
            oldValues: [],
            newValues: [],
            metadata: ['removed' => $toRemove]
        );
                }
                
                if (!empty($toAdd)) {
                    foreach ($toAdd as $type) {
                        $company->companyRelationships()->create(['type' => $type]);
                    }
                    SystemActivityService::record(
            actor: auth()->user(),
            action: 'relationship_added',
            module: 'Company',
            entity: $company,
            oldValues: [],
            newValues: [],
            metadata: ['added' => $toAdd]
        );
                }
                
                if (!empty($toAdd) || !empty($toRemove)) {
                    SystemActivityService::record(
            actor: auth()->user(),
            action: 'relationship_changed',
            module: 'Company',
            entity: $company,
            oldValues: ['relationships' => $existingTypes],
            newValues: ['relationships' => $relationships],
            metadata: []
        );
                }
            }

            if ($company->wasChanged()) {
                SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Company',
            entity: $company,
            oldValues: $oldValues,
            newValues: $company->toArray(),
            metadata: []
        );

                SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Company',
            entity: $company,
            oldValues: [],
            newValues: [],
            metadata: ['changes' => $company->getChanges()]
        );
            }
            
            // Reassign account manager if provided explicitly
            if ($hasAccountManager && $company->account_manager_id != $accountManagerId) {
                app(AssignCompanyAccountManager::class)->execute($company, $accountManagerId);
            }

            return $company->fresh(['companyRelationships', 'accountManager.user']);
        });
    }
}

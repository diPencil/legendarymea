<?php

namespace App\Services;

use App\Models\Company;
use App\Models\AuditLog;
use App\Models\CrmActivity;
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
                    CrmActivity::create([
                        'actor_id' => auth()->id(),
                        'type' => 'company.relationship_removed',
                        'subject_type' => Company::class,
                        'subject_id' => $company->id,
                        'company_id' => $company->id,
                        'metadata' => ['removed' => $toRemove],
                    ]);
                }
                
                if (!empty($toAdd)) {
                    foreach ($toAdd as $type) {
                        $company->companyRelationships()->create(['type' => $type]);
                    }
                    CrmActivity::create([
                        'actor_id' => auth()->id(),
                        'type' => 'company.relationship_added',
                        'subject_type' => Company::class,
                        'subject_id' => $company->id,
                        'company_id' => $company->id,
                        'metadata' => ['added' => $toAdd],
                    ]);
                }
                
                if (!empty($toAdd) || !empty($toRemove)) {
                    AuditLog::create([
                        'user_id' => auth()->id(),
                        'action' => 'company.relationship_changed',
                        'subject_type' => Company::class,
                        'subject_id' => $company->id,
                        'old_values' => ['relationships' => $existingTypes],
                        'new_values' => ['relationships' => $relationships],
                        'request_context' => [
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                        ],
                    ]);
                }
            }

            if ($company->wasChanged()) {
                AuditLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'company.updated',
                    'subject_type' => Company::class,
                    'subject_id' => $company->id,
                    'old_values' => $oldValues,
                    'new_values' => $company->toArray(),
                    'request_context' => [
                        'ip' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ],
                ]);

                CrmActivity::create([
                    'actor_id' => auth()->id(),
                    'type' => 'company.updated',
                    'subject_type' => Company::class,
                    'subject_id' => $company->id,
                    'company_id' => $company->id,
                    'metadata' => ['changes' => $company->getChanges()],
                ]);
            }
            
            // Reassign account manager if provided explicitly
            if ($hasAccountManager && $company->account_manager_id != $accountManagerId) {
                app(AssignCompanyAccountManager::class)->execute($company, $accountManagerId);
            }

            return $company->fresh(['companyRelationships', 'accountManager.user']);
        });
    }
}

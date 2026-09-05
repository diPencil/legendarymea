<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\ClientOnboarding;
use App\Models\Company;
use App\Models\Contract;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateClientOnboardingService
{
    public function execute(array $data, $creator): ClientOnboarding
    {
        $contract = Contract::findOrFail($data['contract_id']);

        if ($contract->company_id !== (int) $data['company_id']) {
            throw ValidationException::withMessages([
                'contract_id' => 'The selected contract does not belong to the selected company.',
            ]);
        }

        if ($contract->status !== ContractStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'contract_id' => 'Onboarding requires an active contract.',
            ]);
        }

        $existing = ClientOnboarding::where('contract_id', $contract->id)
            ->whereIn('status', [ClientOnboardingStatus::DRAFT, ClientOnboardingStatus::IN_PROGRESS])
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'contract_id' => 'A non-terminal onboarding already exists for this contract.',
            ]);
        }

        return DB::transaction(function () use ($data, $creator) {
            $year = now()->year;
            $count = ClientOnboarding::whereYear('created_at', $year)->count() + 1;
            $reference = 'LM-ONB-' . $year . '-' . str_pad((string)$count, 6, '0', STR_PAD_LEFT);

            // Double check uniqueness
            while (ClientOnboarding::where('reference', $reference)->exists()) {
                $count++;
                $reference = 'LM-ONB-' . $year . '-' . str_pad((string)$count, 6, '0', STR_PAD_LEFT);
            }

            $onboarding = ClientOnboarding::create([
                'reference' => $reference,
                'company_id' => $data['company_id'],
                'contract_id' => $data['contract_id'],
                'status' => ClientOnboardingStatus::DRAFT,
                'assigned_to' => $data['assigned_to'] ?? null,
                'kickoff_date' => $data['kickoff_date'] ?? null,
                'target_go_live_date' => $data['target_go_live_date'] ?? null,
                'requirements' => $data['requirements'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $creator->id,
            ]);

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'ClientOnboarding',
            entity: $onboarding,
            oldValues: [],
            newValues: $onboarding->toArray(),
            metadata: []
        );

            return $onboarding;
        });
    }
}
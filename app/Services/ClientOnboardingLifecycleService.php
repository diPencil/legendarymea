<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\ClientOnboarding;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientOnboardingLifecycleService
{
    public function start(ClientOnboarding $onboarding, $editor): ClientOnboarding
    {
        if ($onboarding->status !== ClientOnboardingStatus::DRAFT) {
            throw ValidationException::withMessages([
                'status' => 'Only draft onboardings can be started.',
            ]);
        }

        $contract = $onboarding->contract;
        if (!$contract) {
            throw ValidationException::withMessages([
                'contract_id' => 'Contract no longer exists.',
            ]);
        }

        if ($contract->company_id !== $onboarding->company_id) {
            throw ValidationException::withMessages([
                'contract_id' => 'Contract no longer belongs to the company.',
            ]);
        }

        if ($contract->status !== ContractStatus::ACTIVE) {
            throw ValidationException::withMessages([
                'contract_id' => 'Cannot start onboarding because the contract is no longer active.',
            ]);
        }

        $existing = ClientOnboarding::where('contract_id', $contract->id)
            ->where('id', '!=', $onboarding->id)
            ->whereIn('status', [ClientOnboardingStatus::DRAFT, ClientOnboardingStatus::IN_PROGRESS])
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'contract_id' => 'A non-terminal onboarding already exists for this contract.',
            ]);
        }

        return DB::transaction(function () use ($onboarding, $editor) {
            $original = $onboarding->getOriginal();
            $onboarding->status = ClientOnboardingStatus::IN_PROGRESS;
            $onboarding->save();

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'started',
            module: 'ClientOnboarding',
            entity: $onboarding,
            oldValues: $original,
            newValues: $onboarding->toArray(),
            metadata: []
        );

            return $onboarding;
        });
    }

    public function complete(ClientOnboarding $onboarding, $editor): ClientOnboarding
    {
        if ($onboarding->status !== ClientOnboardingStatus::IN_PROGRESS) {
            throw ValidationException::withMessages([
                'status' => 'Only in-progress onboardings can be completed.',
            ]);
        }

        return DB::transaction(function () use ($onboarding, $editor) {
            $original = $onboarding->getOriginal();
            $onboarding->status = ClientOnboardingStatus::COMPLETED;
            $onboarding->completed_at = now();
            $onboarding->save();

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'completed',
            module: 'ClientOnboarding',
            entity: $onboarding,
            oldValues: $original,
            newValues: $onboarding->toArray(),
            metadata: []
        );

            return $onboarding;
        });
    }

    public function cancel(ClientOnboarding $onboarding, $editor): ClientOnboarding
    {
        if (!in_array($onboarding->status, [ClientOnboardingStatus::DRAFT, ClientOnboardingStatus::IN_PROGRESS])) {
            throw ValidationException::withMessages([
                'status' => 'Cannot cancel a terminal onboarding.',
            ]);
        }

        return DB::transaction(function () use ($onboarding, $editor) {
            $original = $onboarding->getOriginal();
            $onboarding->status = ClientOnboardingStatus::CANCELLED;
            $onboarding->completed_at = null;
            $onboarding->save();

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'cancelled',
            module: 'ClientOnboarding',
            entity: $onboarding,
            oldValues: $original,
            newValues: $onboarding->toArray(),
            metadata: []
        );

            return $onboarding;
        });
    }
}
<?php

namespace App\Services;

use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\AuditLog;
use App\Models\ClientOnboarding;
use App\Models\CrmActivity;
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

            AuditLog::create([
                'user_id' => $editor->id,
                'action' => 'client_onboarding.started',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'old_values' => $original,
                'new_values' => $onboarding->toArray(),
            ]);

            CrmActivity::create([
                'actor_id' => $editor->id,
                'type' => 'client_onboarding.started',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'company_id' => $onboarding->company_id,
            ]);

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

            AuditLog::create([
                'user_id' => $editor->id,
                'action' => 'client_onboarding.completed',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'old_values' => $original,
                'new_values' => $onboarding->toArray(),
            ]);

            CrmActivity::create([
                'actor_id' => $editor->id,
                'type' => 'client_onboarding.completed',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'company_id' => $onboarding->company_id,
            ]);

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

            AuditLog::create([
                'user_id' => $editor->id,
                'action' => 'client_onboarding.cancelled',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'old_values' => $original,
                'new_values' => $onboarding->toArray(),
            ]);

            CrmActivity::create([
                'actor_id' => $editor->id,
                'type' => 'client_onboarding.cancelled',
                'subject_type' => ClientOnboarding::class,
                'subject_id' => $onboarding->id,
                'company_id' => $onboarding->company_id,
            ]);

            return $onboarding;
        });
    }
}
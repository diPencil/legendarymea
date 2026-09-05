<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\ClientOnboardingStatus;
use App\Models\ClientOnboarding;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateClientOnboardingService
{
    public function execute(ClientOnboarding $onboarding, array $data, $editor): ClientOnboarding
    {
        if (in_array($onboarding->status, [ClientOnboardingStatus::COMPLETED, ClientOnboardingStatus::CANCELLED])) {
            throw ValidationException::withMessages([
                'status' => 'Cannot update a completed or cancelled onboarding.',
            ]);
        }

        return DB::transaction(function () use ($onboarding, $data, $editor) {
            $original = $onboarding->getOriginal();

            if (array_key_exists('assigned_to', $data)) {
                $onboarding->assigned_to = $data['assigned_to'];
            }
            if (array_key_exists('kickoff_date', $data)) {
                $onboarding->kickoff_date = $data['kickoff_date'];
            }
            if (array_key_exists('target_go_live_date', $data)) {
                $onboarding->target_go_live_date = $data['target_go_live_date'];
            }
            if (array_key_exists('requirements', $data)) {
                $onboarding->requirements = $data['requirements'];
            }
            if (array_key_exists('notes', $data)) {
                $onboarding->notes = $data['notes'];
            }

            if ($onboarding->isDirty()) {
                $onboarding->save();

                SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'ClientOnboarding',
            entity: $onboarding,
            oldValues: $original,
            newValues: $onboarding->getChanges(),
            metadata: []
        );
            }

            return $onboarding;
        });
    }
}
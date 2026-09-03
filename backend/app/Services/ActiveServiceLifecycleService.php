<?php

namespace App\Services;

use App\Enums\ActiveServiceStatus;
use App\Enums\ClientOnboardingStatus;
use App\Enums\ContractStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ActiveServiceLifecycleService
{
    public function activate(ActiveService $service, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $actor) {
            if ($service->status !== ActiveServiceStatus::DRAFT) {
                throw new InvalidArgumentException("Only draft services can be activated.");
            }

            $this->validateActivationEligibility($service);

            $this->changeStatus($service, ActiveServiceStatus::ACTIVE, $actor, 'activated');
            return $service;
        });
    }

    public function suspend(ActiveService $service, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $actor) {
            if ($service->status !== ActiveServiceStatus::ACTIVE) {
                throw new InvalidArgumentException("Only active services can be suspended.");
            }

            $this->changeStatus($service, ActiveServiceStatus::SUSPENDED, $actor, 'suspended');
            return $service;
        });
    }

    public function resume(ActiveService $service, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $actor) {
            if ($service->status !== ActiveServiceStatus::SUSPENDED) {
                throw new InvalidArgumentException("Only suspended services can be resumed.");
            }

            if ($service->contract->status !== ContractStatus::ACTIVE) {
                throw new InvalidArgumentException("Cannot resume service: Contract is no longer active.");
            }

            $this->changeStatus($service, ActiveServiceStatus::ACTIVE, $actor, 'resumed');
            return $service;
        });
    }

    public function end(ActiveService $service, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $actor) {
            if (!in_array($service->status, [ActiveServiceStatus::ACTIVE, ActiveServiceStatus::SUSPENDED])) {
                throw new InvalidArgumentException("Only active or suspended services can be ended.");
            }

            $this->changeStatus($service, ActiveServiceStatus::ENDED, $actor, 'ended');
            return $service;
        });
    }

    public function cancel(ActiveService $service, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $actor) {
            if ($service->status !== ActiveServiceStatus::DRAFT) {
                throw new InvalidArgumentException("Only draft services can be cancelled.");
            }

            $this->changeStatus($service, ActiveServiceStatus::CANCELLED, $actor, 'cancelled');
            return $service;
        });
    }

    private function validateActivationEligibility(ActiveService $service): void
    {
        if ($service->contract->company_id !== $service->company_id) {
            throw new InvalidArgumentException("Contract no longer belongs to the service's Company.");
        }

        if ($service->contract->status !== ContractStatus::ACTIVE) {
            throw new InvalidArgumentException("Contract is not active.");
        }

        if ($service->client_onboarding_id) {
            $onboarding = $service->clientOnboarding;
            if ($onboarding->company_id !== $service->company_id || $onboarding->contract_id !== $service->contract_id) {
                throw new InvalidArgumentException("Client Onboarding relationships mismatch.");
            }
            if ($onboarding->status !== ClientOnboardingStatus::COMPLETED) {
                throw new InvalidArgumentException("Client Onboarding is not completed.");
            }
        }

        if ($service->start_date && $service->end_date && $service->end_date < $service->start_date) {
            throw new InvalidArgumentException("End date cannot be before start date.");
        }
    }

    private function changeStatus(ActiveService $service, ActiveServiceStatus $newStatus, User $actor, string $actionName): void
    {
        $oldValues = $service->toArray();
        $service->status = $newStatus;
        $service->save();

        AuditLog::create([
            'user_id' => $actor->id,
            'action' => "active_service.{$actionName}",
            'subject_type' => ActiveService::class,
            'subject_id' => $service->id,
            'old_values' => $oldValues,
            'new_values' => $service->toArray(),
        ]);

        CrmActivity::create([
            'actor_id' => $actor->id,
            'type' => "active_service.{$actionName}",
            'subject_type' => ActiveService::class,
            'subject_id' => $service->id,
            'company_id' => $service->company_id,
        ]);
    }
}

<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\ActiveServiceStatus;
use App\Enums\ContractStatus;
use App\Enums\ClientOnboardingStatus;
use App\Models\ActiveService;
use App\Models\ClientOnboarding;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateActiveServiceService
{
    public function __construct(private ReferenceGeneratorService $referenceGenerator)
    {
    }

    public function execute(array $data, User $creator): ActiveService
    {
        return DB::transaction(function () use ($data, $creator) {
            $contract = Contract::find($data['contract_id']);
            if (!$contract) {
                throw new InvalidArgumentException("Contract not found.");
            }

            if ($contract->company_id != $data['company_id']) {
                throw new InvalidArgumentException("Contract does not belong to the selected Company.");
            }

            if ($contract->status !== ContractStatus::ACTIVE) {
                throw new InvalidArgumentException("Contract must be active.");
            }

            if (!empty($data['client_onboarding_id'])) {
                $onboarding = ClientOnboarding::find($data['client_onboarding_id']);
                if (!$onboarding) {
                    throw new InvalidArgumentException("Client Onboarding not found.");
                }

                if ($onboarding->company_id != $data['company_id']) {
                    throw new InvalidArgumentException("Client Onboarding does not belong to the selected Company.");
                }

                if ($onboarding->contract_id != $data['contract_id']) {
                    throw new InvalidArgumentException("Client Onboarding does not belong to the selected Contract.");
                }

                if ($onboarding->status !== ClientOnboardingStatus::COMPLETED) {
                    throw new InvalidArgumentException("Client Onboarding must be completed.");
                }
            }

            if (!empty($data['start_date']) && !empty($data['end_date'])) {
                if ($data['end_date'] < $data['start_date']) {
                    throw new InvalidArgumentException("End date cannot be before start date.");
                }
            }

            $reference = $this->referenceGenerator->generate('LM-SVC-' . date('Y') . '-', 'active_services', 'reference');

            $service = ActiveService::create([
                'reference' => $reference,
                'service_catalog_id' => $data['service_catalog_id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'company_id' => $data['company_id'],
                'contract_id' => $data['contract_id'],
                'client_onboarding_id' => $data['client_onboarding_id'] ?? null,
                'status' => ActiveServiceStatus::DRAFT,
                'assigned_to' => $data['assigned_to'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $creator->id,
            ]);

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'ActiveService',
            entity: $service,
            oldValues: [],
            newValues: $service->toArray(),
            metadata: []
        );

            return $service;
        });
    }
}

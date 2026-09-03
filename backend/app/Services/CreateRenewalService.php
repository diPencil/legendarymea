<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\RenewalStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\Contract;
use App\Models\CrmActivity;
use App\Models\Renewal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateRenewalService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
    ) {}

    public function execute(array $data, int $creatorId): Renewal
    {
        $contract = Contract::findOrFail($data['contract_id']);
        $this->validateSource($data, $contract);

        return DB::transaction(function () use ($data, $contract, $creatorId) {
            $renewal = Renewal::create([
                'reference' => $this->referenceGenerator->generate('LM-RNW-' . date('Y') . '-', 'renewals', 'reference', 6),
                'company_id' => $data['company_id'],
                'contract_id' => $contract->id,
                'active_service_id' => $data['active_service_id'] ?? null,
                'status' => now()->startOfDay()->gte(\Illuminate\Support\Carbon::parse($data['renewal_due_date'])->startOfDay())
                    ? RenewalStatus::DUE
                    : RenewalStatus::UPCOMING,
                'renewal_due_date' => $data['renewal_due_date'],
                'proposed_start_date' => $data['proposed_start_date'] ?? null,
                'proposed_end_date' => $data['proposed_end_date'] ?? null,
                'renewal_amount' => isset($data['renewal_amount']) ? number_format((float) $data['renewal_amount'], 2, '.', '') : null,
                'currency' => isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
                'assigned_to' => $data['assigned_to'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $creatorId,
            ]);

            AuditLog::create([
                'user_id' => $creatorId,
                'action' => 'renewal.created',
                'subject_type' => Renewal::class,
                'subject_id' => $renewal->id,
                'new_values' => ['reference' => $renewal->reference, 'status' => $renewal->status->value],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $creatorId,
                'type' => 'renewal.created',
                'subject_type' => Renewal::class,
                'subject_id' => $renewal->id,
                'company_id' => $renewal->company_id,
                'metadata' => ['renewal_reference' => $renewal->reference, 'contract_reference' => $contract->reference],
            ]);

            return $renewal->load(['company', 'contract', 'activeService', 'assignee', 'renewedContract', 'creator']);
        });
    }

    public function validateSource(array $data, Contract $contract, ?Renewal $ignoreRenewal = null): void
    {
        if ((int) $contract->company_id !== (int) $data['company_id']) {
            throw ValidationException::withMessages(['contract_id' => ['Contract does not belong to the selected company.']]);
        }

        if (!in_array($contract->status, [ContractStatus::ACTIVE, ContractStatus::EXPIRED], true)) {
            throw ValidationException::withMessages(['contract_id' => ['Only active or expired contracts can be renewed.']]);
        }

        $hasOpenRenewal = Renewal::where('contract_id', $contract->id)
            ->whereIn('status', [RenewalStatus::UPCOMING->value, RenewalStatus::DUE->value])
            ->when($ignoreRenewal, fn ($query) => $query->where('id', '!=', $ignoreRenewal->id))
            ->exists();

        if ($hasOpenRenewal) {
            throw ValidationException::withMessages(['contract_id' => ['This contract already has an open renewal.']]);
        }

        if (isset($data['renewal_amount']) && empty($data['currency'])) {
            throw ValidationException::withMessages(['currency' => ['Currency is required when a renewal amount is provided.']]);
        }

        if (!empty($data['active_service_id'])) {
            $service = ActiveService::findOrFail($data['active_service_id']);
            if ((int) $service->company_id !== (int) $data['company_id'] || (int) $service->contract_id !== (int) $contract->id) {
                throw ValidationException::withMessages(['active_service_id' => ['Active service must belong to the same company and contract.']]);
            }
        }
    }
}

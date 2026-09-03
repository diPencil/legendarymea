<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\AuditLog;
use App\Models\Contract;
use App\Models\CrmActivity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContractLifecycleService
{
    public function activate(Contract $contract, int $userId): Contract
    {
        $this->ensureCanTransition($contract->status, ContractStatus::ACTIVE);

        if (!$contract->company()->exists()) {
            throw ValidationException::withMessages([
                'company_id' => ['Company is required to activate the contract.'],
            ]);
        }

        if (!$contract->title) {
            throw ValidationException::withMessages([
                'title' => ['Title is required to activate the contract.'],
            ]);
        }

        if ($contract->start_date && $contract->end_date && $contract->end_date < $contract->start_date) {
            throw ValidationException::withMessages([
                'end_date' => ['End date cannot be before start date.'],
            ]);
        }

        if ($contract->contract_value !== null && !$contract->currency) {
            throw ValidationException::withMessages([
                'currency' => ['Currency is required when contract value is set.'],
            ]);
        }

        if ($contract->quotation_id) {
            $quotation = $contract->quotation;
            if (!$quotation || $quotation->status !== \App\Enums\QuotationStatus::ACCEPTED) {
                throw ValidationException::withMessages([
                    'quotation_id' => ['The linked quotation must be accepted to activate the contract.'],
                ]);
            }
        }

        return $this->transitionStatus($contract, ContractStatus::ACTIVE, 'contract.activated', $userId);
    }

    public function expire(Contract $contract, int $userId): Contract
    {
        $this->ensureCanTransition($contract->status, ContractStatus::EXPIRED);

        return $this->transitionStatus($contract, ContractStatus::EXPIRED, 'contract.expired', $userId);
    }

    public function terminate(Contract $contract, int $userId): Contract
    {
        $this->ensureCanTransition($contract->status, ContractStatus::TERMINATED);

        return $this->transitionStatus($contract, ContractStatus::TERMINATED, 'contract.terminated', $userId);
    }

    public function cancel(Contract $contract, int $userId): Contract
    {
        $this->ensureCanTransition($contract->status, ContractStatus::CANCELLED);

        return $this->transitionStatus($contract, ContractStatus::CANCELLED, 'contract.cancelled', $userId);
    }

    public function revertToDraft(Contract $contract, int $userId): Contract
    {
        $this->ensureCanTransition($contract->status, ContractStatus::DRAFT);

        return $this->transitionStatus($contract, ContractStatus::DRAFT, 'contract.reverted_to_draft', $userId);
    }

    private function ensureCanTransition(ContractStatus $current, ContractStatus $target): void
    {
        $allowed = [
            ContractStatus::DRAFT->value => [ContractStatus::ACTIVE->value, ContractStatus::CANCELLED->value],
            ContractStatus::ACTIVE->value => [ContractStatus::DRAFT->value, ContractStatus::EXPIRED->value, ContractStatus::TERMINATED->value],
        ];

        if (!isset($allowed[$current->value]) || !in_array($target->value, $allowed[$current->value])) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition contract from {$current->value} to {$target->value}."],
            ]);
        }
    }

    private function transitionStatus(Contract $contract, ContractStatus $newStatus, string $actionName, int $userId): Contract
    {
        return DB::transaction(function () use ($contract, $newStatus, $actionName, $userId) {
            $oldValues = $this->auditValues($contract);
            $contract->status = $newStatus;
            $contract->save();

            AuditLog::create([
                'user_id'         => $userId,
                'action'          => $actionName,
                'subject_type'    => Contract::class,
                'subject_id'      => $contract->id,
                'old_values'      => $oldValues,
                'new_values'      => $this->auditValues($contract),
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id'     => $userId,
                'type'         => $actionName,
                'subject_type' => Contract::class,
                'subject_id'   => $contract->id,
                'company_id'   => $contract->company_id,
                'metadata'     => [
                    'contract_id'        => $contract->id,
                    'contract_reference' => $contract->reference,
                    'status'             => $contract->status->value,
                ],
            ]);

            return $contract;
        });
    }

    private function auditValues(Contract $contract): array
    {
        return array_intersect_key($contract->toArray(), array_flip([
            'id', 'reference', 'status', 'company_id'
        ]));
    }
}

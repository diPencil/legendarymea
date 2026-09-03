<?php

namespace App\Services;

use App\Enums\RenewalStatus;
use App\Models\AuditLog;
use App\Models\Contract;
use App\Models\CrmActivity;
use App\Models\Renewal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RenewalLifecycleService
{
    public function markDue(Renewal $renewal, int $userId): Renewal
    {
        return $this->transition($renewal, RenewalStatus::DUE, $userId, function (Renewal $record) {
            if ($record->status !== RenewalStatus::UPCOMING) {
                throw ValidationException::withMessages(['status' => ['Only upcoming renewals can be marked due.']]);
            }

            return ['status' => RenewalStatus::DUE];
        });
    }

    public function complete(Renewal $renewal, int $renewedContractId, int $userId): Renewal
    {
        return $this->transition($renewal, RenewalStatus::COMPLETED, $userId, function (Renewal $record) use ($renewedContractId) {
            if (!in_array($record->status, [RenewalStatus::UPCOMING, RenewalStatus::DUE], true)) {
                throw ValidationException::withMessages(['status' => ['Only upcoming or due renewals can be completed.']]);
            }

            $successor = Contract::findOrFail($renewedContractId);

            if ((int) $successor->company_id !== (int) $record->company_id) {
                throw ValidationException::withMessages(['renewed_contract_id' => ['Successor contract must belong to the same company.']]);
            }

            if ((int) $successor->id === (int) $record->contract_id) {
                throw ValidationException::withMessages(['renewed_contract_id' => ['Successor contract must differ from the source contract.']]);
            }

            return [
                'status' => RenewalStatus::COMPLETED,
                'renewed_contract_id' => $successor->id,
                'completed_at' => now(),
            ];
        });
    }

    public function decline(Renewal $renewal, int $userId): Renewal
    {
        return $this->transition($renewal, RenewalStatus::DECLINED, $userId, function (Renewal $record) {
            if (!in_array($record->status, [RenewalStatus::UPCOMING, RenewalStatus::DUE], true)) {
                throw ValidationException::withMessages(['status' => ['Only upcoming or due renewals can be declined.']]);
            }

            return ['status' => RenewalStatus::DECLINED];
        });
    }

    public function cancel(Renewal $renewal, int $userId): Renewal
    {
        return $this->transition($renewal, RenewalStatus::CANCELLED, $userId, function (Renewal $record) {
            if (!in_array($record->status, [RenewalStatus::UPCOMING, RenewalStatus::DUE], true)) {
                throw ValidationException::withMessages(['status' => ['Only upcoming or due renewals can be cancelled.']]);
            }

            return ['status' => RenewalStatus::CANCELLED];
        });
    }

    private function transition(Renewal $renewal, RenewalStatus $targetStatus, int $userId, callable $mutator): Renewal
    {
        return DB::transaction(function () use ($renewal, $targetStatus, $userId, $mutator) {
            $oldStatus = $renewal->status->value;
            $attributes = $mutator($renewal);
            $renewal->update($attributes);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'renewal.' . $targetStatus->value,
                'subject_type' => Renewal::class,
                'subject_id' => $renewal->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => $renewal->status->value],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'renewal.' . $targetStatus->value,
                'subject_type' => Renewal::class,
                'subject_id' => $renewal->id,
                'company_id' => $renewal->company_id,
                'metadata' => ['renewal_reference' => $renewal->reference],
            ]);

            return $renewal->load(['company', 'contract', 'activeService', 'assignee', 'renewedContract', 'creator']);
        });
    }
}

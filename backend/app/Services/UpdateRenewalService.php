<?php

namespace App\Services;

use App\Enums\RenewalStatus;
use App\Models\AuditLog;
use App\Models\Renewal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateRenewalService
{
    public function __construct(
        private CreateRenewalService $createRenewalService,
    ) {}

    public function execute(Renewal $renewal, array $data, int $userId): Renewal
    {
        if (!in_array($renewal->status, [RenewalStatus::UPCOMING, RenewalStatus::DUE], true)) {
            throw ValidationException::withMessages(['status' => ['Only upcoming or due renewals can be edited.']]);
        }

        $merged = array_merge($renewal->only([
            'company_id', 'contract_id', 'active_service_id', 'renewal_due_date', 'proposed_start_date',
            'proposed_end_date', 'renewal_amount', 'currency', 'assigned_to', 'notes',
        ]), $data);

        $this->createRenewalService->validateSource($merged, $renewal->contract, $renewal);

        return DB::transaction(function () use ($renewal, $data, $userId) {
            $oldValues = $renewal->only(['status', 'renewal_due_date', 'renewal_amount', 'currency', 'assigned_to']);

            $renewal->update([
                'active_service_id' => array_key_exists('active_service_id', $data) ? $data['active_service_id'] : $renewal->active_service_id,
                'renewal_due_date' => $data['renewal_due_date'] ?? $renewal->renewal_due_date,
                'proposed_start_date' => array_key_exists('proposed_start_date', $data) ? $data['proposed_start_date'] : $renewal->proposed_start_date,
                'proposed_end_date' => array_key_exists('proposed_end_date', $data) ? $data['proposed_end_date'] : $renewal->proposed_end_date,
                'renewal_amount' => array_key_exists('renewal_amount', $data) ? (isset($data['renewal_amount']) ? number_format((float) $data['renewal_amount'], 2, '.', '') : null) : $renewal->renewal_amount,
                'currency' => array_key_exists('currency', $data) ? ($data['currency'] ? strtoupper((string) $data['currency']) : null) : $renewal->currency,
                'assigned_to' => array_key_exists('assigned_to', $data) ? $data['assigned_to'] : $renewal->assigned_to,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $renewal->notes,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'renewal.updated',
                'subject_type' => Renewal::class,
                'subject_id' => $renewal->id,
                'old_values' => $oldValues,
                'new_values' => $renewal->only(['status', 'renewal_due_date', 'renewal_amount', 'currency', 'assigned_to']),
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            return $renewal->load(['company', 'contract', 'activeService', 'assignee', 'renewedContract', 'creator']);
        });
    }
}

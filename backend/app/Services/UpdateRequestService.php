<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Request;
use Illuminate\Support\Facades\DB;

class UpdateRequestService
{
    public function execute(Request $request, array $data, int $updatedBy): Request
    {
        return DB::transaction(function () use ($request, $data, $updatedBy) {
            $oldData = $this->auditValues($request);
            $oldStatus = $request->status;

            unset($data['assigned_to'], $data['reference'], $data['created_by'], $data['started_at'], $data['completed_at']);
            $data = $this->applyStatusTimestamps($request, $data);

            $request->update($data);
            $request->refresh();

            AuditLog::create([
                'user_id' => $updatedBy,
                'action' => 'request.updated',
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'old_values' => $oldData,
                'new_values' => $this->auditValues($request),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $updatedBy,
                'type' => 'request.updated',
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'company_id' => $request->company_id,
                'metadata' => [
                    'request_id' => $request->id,
                    'request_reference' => $request->reference,
                    'updated_fields' => array_keys($data),
                    'old_status' => $oldStatus?->value,
                    'new_status' => $request->status?->value,
                ],
            ]);

            if ($oldStatus !== $request->status) {
                CrmActivity::create([
                    'actor_id' => $updatedBy,
                    'type' => 'request.status_changed',
                    'subject_type' => Request::class,
                    'subject_id' => $request->id,
                    'company_id' => $request->company_id,
                    'metadata' => [
                        'request_id' => $request->id,
                        'request_reference' => $request->reference,
                        'old_status' => $oldStatus?->value,
                        'new_status' => $request->status?->value,
                    ],
                ]);
            }

            return $request->fresh();
        });
    }

    private function applyStatusTimestamps(Request $request, array $data): array
    {
        if (! array_key_exists('status', $data)) {
            return $data;
        }

        $status = RequestStatus::tryFrom($data['status']);

        if ($status === RequestStatus::IN_PROGRESS && $request->started_at === null) {
            $data['started_at'] = now();
        }

        if ($status === RequestStatus::COMPLETED) {
            $data['completed_at'] = now();
        }

        if ($request->status === RequestStatus::COMPLETED && $status !== RequestStatus::COMPLETED) {
            $data['completed_at'] = null;
        }

        return $data;
    }

    private function auditValues(Request $request): array
    {
        return array_intersect_key($request->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'opportunity_id',
            'assigned_to',
            'title',
            'service_interest',
            'status',
            'priority',
            'due_at',
            'started_at',
            'completed_at',
            'created_by',
        ]));
    }
}

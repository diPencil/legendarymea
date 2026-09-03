<?php

namespace App\Services;

use App\Enums\RequestStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Request;
use Illuminate\Support\Facades\DB;

class CreateRequestService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, int $createdBy): Request
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $data['reference'] = $this->referenceGenerator->generate('LM-REQ-' . date('Y') . '-', 'requests', 'reference', 6);
            $data['created_by'] = $createdBy;
            $data = $this->applyStatusTimestamps($data);

            $request = Request::create($data);
            $request->refresh();

            AuditLog::create([
                'user_id' => $createdBy,
                'action' => 'request.created',
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'old_values' => null,
                'new_values' => $this->auditValues($request),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $createdBy,
                'type' => 'request.created',
                'subject_type' => Request::class,
                'subject_id' => $request->id,
                'company_id' => $request->company_id,
                'metadata' => [
                    'request_id' => $request->id,
                    'request_reference' => $request->reference,
                    'status' => $request->status?->value,
                ],
            ]);

            return $request;
        });
    }

    private function applyStatusTimestamps(array $data): array
    {
        $status = isset($data['status']) ? RequestStatus::tryFrom($data['status']) : null;

        if ($status === RequestStatus::IN_PROGRESS) {
            $data['started_at'] = now();
        }

        if ($status === RequestStatus::COMPLETED) {
            $data['completed_at'] = now();
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

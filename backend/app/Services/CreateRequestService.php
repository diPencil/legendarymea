<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\RequestStatus;
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

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'created',
            module: 'Request',
            entity: $request,
            oldValues: null,
            newValues: $this->auditValues($request),
            metadata: [
                            'request_id' => $request->id,
                            'request_reference' => $request->reference,
                            'status' => $request->status?->value,
                        ]
        );

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

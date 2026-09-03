<?php

namespace App\Services;

use App\Enums\FollowUpStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\FollowUp;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateFollowUpService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, int $createdBy): FollowUp
    {
        $this->validateRelationshipIntegrity($data);

        return DB::transaction(function () use ($data, $createdBy) {
            $data['reference'] = $this->referenceGenerator->generate('LM-FUP-' . date('Y') . '-', 'follow_ups', 'reference', 6);
            $data['created_by'] = $createdBy;
            $data = $this->applyStatusTimestamps($data);

            $followUp = FollowUp::create($data);
            $followUp->refresh();

            AuditLog::create([
                'user_id' => $createdBy,
                'action' => 'follow_up.created',
                'subject_type' => FollowUp::class,
                'subject_id' => $followUp->id,
                'old_values' => null,
                'new_values' => $this->auditValues($followUp),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $createdBy,
                'type' => 'follow_up.created',
                'subject_type' => FollowUp::class,
                'subject_id' => $followUp->id,
                'company_id' => $followUp->company_id,
                'metadata' => [
                    'follow_up_id' => $followUp->id,
                    'follow_up_reference' => $followUp->reference,
                    'status' => $followUp->status?->value,
                ],
            ]);

            return $followUp;
        });
    }

    private function validateRelationshipIntegrity(array $data): void
    {
        $companyId = $data['company_id'] ?? null;
        if (! $companyId) {
            return;
        }

        if (!empty($data['contact_id'])) {
            $contact = Contact::find($data['contact_id']);
            if ($contact && (int)$contact->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['lead_id'])) {
            $lead = Lead::find($data['lead_id']);
            if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'lead_id' => ['The selected lead does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['opportunity_id'])) {
            $opportunity = Opportunity::find($data['opportunity_id']);
            if ($opportunity && (int)$opportunity->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['request_id'])) {
            $request = Request::find($data['request_id']);
            if ($request && (int)$request->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'request_id' => ['The selected request does not belong to the selected company.'],
                ]);
            }
        }
    }

    private function applyStatusTimestamps(array $data): array
    {
        $status = isset($data['status']) ? FollowUpStatus::tryFrom($data['status']) : FollowUpStatus::PENDING;
        if (!$status) {
            $status = FollowUpStatus::PENDING;
        }
        $data['status'] = $status->value;

        if ($status === FollowUpStatus::COMPLETED) {
            $data['completed_at'] = now();
        }

        return $data;
    }

    private function auditValues(FollowUp $followUp): array
    {
        return array_intersect_key($followUp->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'task_id',
            'assigned_to',
            'title',
            'notes',
            'status',
            'follow_up_at',
            'completed_at',
            'created_by',
        ]));
    }
}

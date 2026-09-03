<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Task;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTaskService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, int $createdBy): Task
    {
        $this->validateRelationshipIntegrity($data);

        return DB::transaction(function () use ($data, $createdBy) {
            $data['reference'] = $this->referenceGenerator->generate('LM-TSK-' . date('Y') . '-', 'tasks', 'reference', 6);
            $data['created_by'] = $createdBy;
            $data = $this->applyStatusTimestamps($data);

            $task = Task::create($data);
            $task->refresh();

            AuditLog::create([
                'user_id' => $createdBy,
                'action' => 'task.created',
                'subject_type' => Task::class,
                'subject_id' => $task->id,
                'old_values' => null,
                'new_values' => $this->auditValues($task),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            CrmActivity::create([
                'actor_id' => $createdBy,
                'type' => 'task.created',
                'subject_type' => Task::class,
                'subject_id' => $task->id,
                'company_id' => $task->company_id,
                'metadata' => [
                    'task_id' => $task->id,
                    'task_reference' => $task->reference,
                    'status' => $task->status?->value,
                ],
            ]);

            return $task;
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
        $status = isset($data['status']) ? TaskStatus::tryFrom($data['status']) : TaskStatus::TODO;

        if ($status === TaskStatus::IN_PROGRESS) {
            $data['started_at'] = now();
        }

        if ($status === TaskStatus::COMPLETED) {
            $data['completed_at'] = now();
        }

        return $data;
    }

    private function auditValues(Task $task): array
    {
        return array_intersect_key($task->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'assigned_to',
            'title',
            'description',
            'status',
            'priority',
            'due_at',
            'started_at',
            'completed_at',
            'created_by',
        ]));
    }
}

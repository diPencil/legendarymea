<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateTaskService
{
    public function execute(Task $task, array $data, int $updatedBy): Task
    {
        // Protect assignment from generic update
        if (array_key_exists('assigned_to', $data)) {
            unset($data['assigned_to']);
        }

        $oldCompanyId = $task->company_id;
        $newCompanyId = array_key_exists('company_id', $data) ? $data['company_id'] : $oldCompanyId;
        
        if ($oldCompanyId !== $newCompanyId) {
            // company changed, clear stale relations
            if (!array_key_exists('contact_id', $data) && $task->contact_id) {
                $contact = Contact::find($task->contact_id);
                if ($contact && (int)$contact->company_id !== (int)$newCompanyId) {
                    $data['contact_id'] = null;
                }
            }
            if (!array_key_exists('lead_id', $data) && $task->lead_id) {
                $lead = Lead::find($task->lead_id);
                if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$newCompanyId) {
                    $data['lead_id'] = null;
                }
            }
            if (!array_key_exists('opportunity_id', $data) && $task->opportunity_id) {
                $opportunity = Opportunity::find($task->opportunity_id);
                if ($opportunity && (int)$opportunity->company_id !== (int)$newCompanyId) {
                    $data['opportunity_id'] = null;
                }
            }
            if (!array_key_exists('request_id', $data) && $task->request_id) {
                $request = Request::find($task->request_id);
                if ($request && (int)$request->company_id !== (int)$newCompanyId) {
                    $data['request_id'] = null;
                }
            }
        }

        $this->validateRelationshipIntegrity($task, $data, $newCompanyId);

        return DB::transaction(function () use ($task, $data, $updatedBy, $oldCompanyId, $newCompanyId) {
            $oldData = $this->auditValues($task);



            if (array_key_exists('status', $data) && $data['status'] !== $task->status?->value) {
                $data = $this->applyStatusTimestamps($task, $data);
            }

            $task->update($data);
            $task->refresh();

            $newValues = $this->auditValues($task);
            
            // Only log if something changed
            if ($oldData !== $newValues) {
                $isStatusChange = isset($data['status']);

                SystemActivityService::record(
            actor: auth()->user(),
            action: 'status_changed',
            module: 'Task',
            entity: $task,
            oldValues: $oldData,
            newValues: $newValues,
            metadata: [
                                    'task_id' => $task->id,
                                    'task_reference' => $task->reference,
                                    'old_status' => $oldData['status']
                                ]
        );
            }

            return $task;
        });
    }

    private function validateRelationshipIntegrity(Task $task, array $data, $companyId): void
    {
        if (! $companyId) {
            return;
        }

        $contactId = array_key_exists('contact_id', $data) ? $data['contact_id'] : $task->contact_id;
        if ($contactId) {
            $contact = Contact::find($contactId);
            if ($contact && (int)$contact->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        $leadId = array_key_exists('lead_id', $data) ? $data['lead_id'] : $task->lead_id;
        if ($leadId) {
            $lead = Lead::find($leadId);
            if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'lead_id' => ['The selected lead does not belong to the selected company.'],
                ]);
            }
        }

        $opportunityId = array_key_exists('opportunity_id', $data) ? $data['opportunity_id'] : $task->opportunity_id;
        if ($opportunityId) {
            $opportunity = Opportunity::find($opportunityId);
            if ($opportunity && (int)$opportunity->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        $requestId = array_key_exists('request_id', $data) ? $data['request_id'] : $task->request_id;
        if ($requestId) {
            $request = Request::find($requestId);
            if ($request && (int)$request->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'request_id' => ['The selected request does not belong to the selected company.'],
                ]);
            }
        }
    }

    private function applyStatusTimestamps(Task $task, array $data): array
    {
        $newStatus = TaskStatus::tryFrom($data['status']);
        $oldStatus = $task->status;

        // When moving to TODO, clear completed_at. Also clear started_at (so not actively started).
        if ($newStatus === TaskStatus::TODO) {
            $data['completed_at'] = null;
            $data['started_at'] = null;
        }

        // When moving to IN_PROGRESS, ensure started_at is set. clear completed_at.
        if ($newStatus === TaskStatus::IN_PROGRESS) {
            if (!$task->started_at) {
                $data['started_at'] = now();
            }
            $data['completed_at'] = null;
        }

        // When moving to WAITING, clear completed_at. preserve started_at.
        if ($newStatus === TaskStatus::WAITING) {
            $data['completed_at'] = null;
        }

        // When moving to COMPLETED, set completed_at. preserve started_at.
        if ($newStatus === TaskStatus::COMPLETED) {
            $data['completed_at'] = now();
        }

        // When moving to CANCELLED, clear completed_at. preserve started_at.
        if ($newStatus === TaskStatus::CANCELLED) {
            $data['completed_at'] = null;
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

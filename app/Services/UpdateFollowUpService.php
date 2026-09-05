<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\FollowUpStatus;
use App\Models\FollowUp;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateFollowUpService
{
    public function execute(FollowUp $followUp, array $data, int $updatedBy): FollowUp
    {
        // Protect assignment from generic update
        if (array_key_exists('assigned_to', $data)) {
            unset($data['assigned_to']);
        }

        $oldCompanyId = $followUp->company_id;
        $newCompanyId = array_key_exists('company_id', $data) ? $data['company_id'] : $oldCompanyId;
        
        if ($oldCompanyId !== $newCompanyId) {
            // company changed, clear stale relations
            if (!array_key_exists('contact_id', $data) && $followUp->contact_id) {
                $contact = Contact::find($followUp->contact_id);
                if ($contact && (int)$contact->company_id !== (int)$newCompanyId) {
                    $data['contact_id'] = null;
                }
            }
            if (!array_key_exists('lead_id', $data) && $followUp->lead_id) {
                $lead = Lead::find($followUp->lead_id);
                if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$newCompanyId) {
                    $data['lead_id'] = null;
                }
            }
            if (!array_key_exists('opportunity_id', $data) && $followUp->opportunity_id) {
                $opportunity = Opportunity::find($followUp->opportunity_id);
                if ($opportunity && (int)$opportunity->company_id !== (int)$newCompanyId) {
                    $data['opportunity_id'] = null;
                }
            }
            if (!array_key_exists('request_id', $data) && $followUp->request_id) {
                $request = Request::find($followUp->request_id);
                if ($request && (int)$request->company_id !== (int)$newCompanyId) {
                    $data['request_id'] = null;
                }
            }
            if (!array_key_exists('task_id', $data) && $followUp->task_id) {
                $task = Task::find($followUp->task_id);
                if ($task && $task->company_id && (int)$task->company_id !== (int)$newCompanyId) {
                    $data['task_id'] = null;
                }
            }
        }

        $this->validateRelationshipIntegrity($followUp, $data, $newCompanyId);

        return DB::transaction(function () use ($followUp, $data, $updatedBy, $oldCompanyId, $newCompanyId) {
            $oldData = $this->auditValues($followUp);

            if (array_key_exists('status', $data) && $data['status'] !== $followUp->status?->value) {
                $data = $this->applyStatusTimestamps($followUp, $data);
            }

            $followUp->update($data);
            $followUp->refresh();

            $newValues = $this->auditValues($followUp);
            
            // Only log if something changed
            if ($oldData !== $newValues) {
                $isStatusChange = isset($data['status']);

                SystemActivityService::record(
            actor: auth()->user(),
            action: 'status_changed',
            module: 'FollowUp',
            entity: $followUp,
            oldValues: $oldData,
            newValues: $newValues,
            metadata: [
                                    'follow_up_id' => $followUp->id,
                                    'follow_up_reference' => $followUp->reference,
                                    'old_status' => $oldData['status']
                                ]
        );
            }

            return $followUp;
        });
    }

    private function validateRelationshipIntegrity(FollowUp $followUp, array $data, $companyId): void
    {
        if (! $companyId) {
            return;
        }

        $contactId = array_key_exists('contact_id', $data) ? $data['contact_id'] : $followUp->contact_id;
        if ($contactId) {
            $contact = Contact::find($contactId);
            if ($contact && (int)$contact->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        $leadId = array_key_exists('lead_id', $data) ? $data['lead_id'] : $followUp->lead_id;
        if ($leadId) {
            $lead = Lead::find($leadId);
            if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'lead_id' => ['The selected lead does not belong to the selected company.'],
                ]);
            }
        }

        $opportunityId = array_key_exists('opportunity_id', $data) ? $data['opportunity_id'] : $followUp->opportunity_id;
        if ($opportunityId) {
            $opportunity = Opportunity::find($opportunityId);
            if ($opportunity && (int)$opportunity->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        $requestId = array_key_exists('request_id', $data) ? $data['request_id'] : $followUp->request_id;
        if ($requestId) {
            $request = Request::find($requestId);
            if ($request && (int)$request->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'request_id' => ['The selected request does not belong to the selected company.'],
                ]);
            }
        }

        $taskId = array_key_exists('task_id', $data) ? $data['task_id'] : $followUp->task_id;
        if ($taskId) {
            $task = Task::find($taskId);
            if ($task && $task->company_id && (int)$task->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'task_id' => ['The selected task does not belong to the selected company.'],
                ]);
            }
        }
    }

    private function applyStatusTimestamps(FollowUp $followUp, array $data): array
    {
        $newStatus = FollowUpStatus::tryFrom($data['status']);

        // When moving to PENDING, clear completed_at
        if ($newStatus === FollowUpStatus::PENDING) {
            $data['completed_at'] = null;
        }

        // When moving to COMPLETED, set completed_at
        if ($newStatus === FollowUpStatus::COMPLETED) {
            $data['completed_at'] = now();
        }

        // When moving to CANCELLED, clear completed_at
        if ($newStatus === FollowUpStatus::CANCELLED) {
            $data['completed_at'] = null;
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

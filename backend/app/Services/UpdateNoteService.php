<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Note;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\FollowUp;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateNoteService
{
    public function execute(Note $note, array $data, int $updatedBy): Note
    {
        // Protect reference and created_by from update
        if (array_key_exists('reference', $data)) unset($data['reference']);
        if (array_key_exists('created_by', $data)) unset($data['created_by']);
        
        // If body is absent (not provided), preserve existing value.
        // But Store/UpdateNoteRequest handles this (if it's passed, we take it).

        $oldCompanyId = $note->company_id;
        $newCompanyId = array_key_exists('company_id', $data) ? $data['company_id'] : $oldCompanyId;
        
        if ($oldCompanyId !== $newCompanyId) {
            // company changed, clear stale relations if they are not being explicitly updated
            if (!array_key_exists('contact_id', $data) && $note->contact_id) {
                $contact = Contact::find($note->contact_id);
                if ($contact && (int)$contact->company_id !== (int)$newCompanyId) {
                    $data['contact_id'] = null;
                }
            }
            if (!array_key_exists('lead_id', $data) && $note->lead_id) {
                $lead = Lead::find($note->lead_id);
                if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$newCompanyId) {
                    $data['lead_id'] = null;
                }
            }
            if (!array_key_exists('opportunity_id', $data) && $note->opportunity_id) {
                $opportunity = Opportunity::find($note->opportunity_id);
                if ($opportunity && (int)$opportunity->company_id !== (int)$newCompanyId) {
                    $data['opportunity_id'] = null;
                }
            }
            if (!array_key_exists('request_id', $data) && $note->request_id) {
                $request = Request::find($note->request_id);
                if ($request && (int)$request->company_id !== (int)$newCompanyId) {
                    $data['request_id'] = null;
                }
            }
            if (!array_key_exists('task_id', $data) && $note->task_id) {
                $task = Task::find($note->task_id);
                if ($task && clone($task)->company_id && (int)$task->company_id !== (int)$newCompanyId) {
                    $data['task_id'] = null;
                }
            }
            if (!array_key_exists('follow_up_id', $data) && $note->follow_up_id) {
                $followUp = FollowUp::find($note->follow_up_id);
                if ($followUp && $followUp->company_id && (int)$followUp->company_id !== (int)$newCompanyId) {
                    $data['follow_up_id'] = null;
                }
            }
        }

        $this->validateRelationshipIntegrity($note, $data, $newCompanyId);

        return DB::transaction(function () use ($note, $data, $updatedBy) {
            $oldData = $this->auditValues($note);

            $note->update($data);
            $note->refresh();

            $newValues = $this->auditValues($note);
            
            // Only log if something changed
            if ($oldData !== $newValues) {
                AuditLog::create([
                    'user_id' => $updatedBy,
                    'action' => 'note.updated',
                    'subject_type' => Note::class,
                    'subject_id' => $note->id,
                    'old_values' => $oldData,
                    'new_values' => $newValues,
                    'request_context' => [
                        'ip' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ],
                ]);

                if ($note->company_id || $note->contact_id || $note->lead_id || $note->opportunity_id || $note->request_id || $note->task_id || $note->follow_up_id) {
                    CrmActivity::create([
                        'actor_id' => $updatedBy,
                        'type' => 'note.updated',
                        'subject_type' => Note::class,
                        'subject_id' => $note->id,
                        'company_id' => $note->company_id,
                        'metadata' => [
                            'note_id' => $note->id,
                            'note_reference' => $note->reference,
                            'title' => $note->title,
                        ],
                    ]);
                }
            }

            return $note;
        });
    }

    private function validateRelationshipIntegrity(Note $note, array $data, $companyId): void
    {
        if (! $companyId) {
            return;
        }

        $contactId = array_key_exists('contact_id', $data) ? $data['contact_id'] : $note->contact_id;
        if ($contactId) {
            $contact = Contact::find($contactId);
            if ($contact && (int)$contact->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'contact_id' => ['The selected contact does not belong to the selected company.'],
                ]);
            }
        }

        $leadId = array_key_exists('lead_id', $data) ? $data['lead_id'] : $note->lead_id;
        if ($leadId) {
            $lead = Lead::find($leadId);
            if ($lead && $lead->company_id && (int)$lead->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'lead_id' => ['The selected lead does not belong to the selected company.'],
                ]);
            }
        }

        $opportunityId = array_key_exists('opportunity_id', $data) ? $data['opportunity_id'] : $note->opportunity_id;
        if ($opportunityId) {
            $opportunity = Opportunity::find($opportunityId);
            if ($opportunity && (int)$opportunity->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'opportunity_id' => ['The selected opportunity does not belong to the selected company.'],
                ]);
            }
        }

        $requestId = array_key_exists('request_id', $data) ? $data['request_id'] : $note->request_id;
        if ($requestId) {
            $request = Request::find($requestId);
            if ($request && (int)$request->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'request_id' => ['The selected request does not belong to the selected company.'],
                ]);
            }
        }

        $taskId = array_key_exists('task_id', $data) ? $data['task_id'] : $note->task_id;
        if ($taskId) {
            $task = Task::find($taskId);
            if ($task && $task->company_id && (int)$task->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'task_id' => ['The selected task does not belong to the selected company.'],
                ]);
            }
        }

        $followUpId = array_key_exists('follow_up_id', $data) ? $data['follow_up_id'] : $note->follow_up_id;
        if ($followUpId) {
            $followUp = FollowUp::find($followUpId);
            if ($followUp && $followUp->company_id && (int)$followUp->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'follow_up_id' => ['The selected follow up does not belong to the selected company.'],
                ]);
            }
        }
    }

    private function auditValues(Note $note): array
    {
        return array_intersect_key($note->toArray(), array_flip([
            'id',
            'reference',
            'title',
            'body',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'task_id',
            'follow_up_id',
            'created_by',
        ]));
    }
}

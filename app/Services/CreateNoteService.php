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

class CreateNoteService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator
    ) {}

    public function execute(array $data, int $createdBy): Note
    {
        $this->validateRelationshipIntegrity($data);

        return DB::transaction(function () use ($data, $createdBy) {
            $data['reference'] = $this->referenceGenerator->generate('LM-NTE-' . date('Y') . '-', 'notes', 'reference', 6);
            $data['created_by'] = $createdBy;

            $note = Note::create($data);
            $note->refresh();

            AuditLog::create([
                'user_id' => $createdBy,
                'action' => 'note.created',
                'subject_type' => Note::class,
                'subject_id' => $note->id,
                'old_values' => null,
                'new_values' => $this->auditValues($note),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
            ]);

            // Create CRM Activity for meaningful business context
            if ($note->company_id || $note->contact_id || $note->lead_id || $note->opportunity_id || $note->request_id || $note->task_id || $note->follow_up_id) {
                CrmActivity::create([
                    'actor_id' => $createdBy,
                    'type' => 'note.created',
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

            return $note;
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

        if (!empty($data['task_id'])) {
            $task = Task::find($data['task_id']);
            if ($task && $task->company_id && (int)$task->company_id !== (int)$companyId) {
                throw ValidationException::withMessages([
                    'task_id' => ['The selected task does not belong to the selected company.'],
                ]);
            }
        }

        if (!empty($data['follow_up_id'])) {
            $followUp = FollowUp::find($data['follow_up_id']);
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

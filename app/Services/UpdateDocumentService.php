<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateDocumentService
{
    public function execute(Document $document, array $data): Document
    {
        return DB::transaction(function () use ($document, $data) {
            $oldValues = $document->toArray();
            
            // Allow explicit null clearing, so we use array_key_exists
            if (array_key_exists('title', $data)) {
                $document->title = $data['title'];
            }
            if (array_key_exists('description', $data)) {
                $document->description = $data['description'];
            }
            
            if (array_key_exists('company_id', $data)) {
                $document->company_id = $data['company_id'];
            }
            if (array_key_exists('contact_id', $data)) {
                $document->contact_id = $data['contact_id'];
            }
            if (array_key_exists('lead_id', $data)) {
                $document->lead_id = $data['lead_id'];
            }
            if (array_key_exists('opportunity_id', $data)) {
                $document->opportunity_id = $data['opportunity_id'];
            }
            if (array_key_exists('request_id', $data)) {
                $document->request_id = $data['request_id'];
            }
            if (array_key_exists('task_id', $data)) {
                $document->task_id = $data['task_id'];
            }
            if (array_key_exists('follow_up_id', $data)) {
                $document->follow_up_id = $data['follow_up_id'];
            }
            if (array_key_exists('note_id', $data)) {
                $document->note_id = $data['note_id'];
            }

            // Validation Integrity
            if ($document->company_id) {
                if ($document->contact_id && Contact::where('id', $document->contact_id)->value('company_id') != $document->company_id) {
                    $document->contact_id = null; // Clear incompatible contact according to project rule
                }
                if ($document->lead_id && Lead::where('id', $document->lead_id)->value('company_id') != $document->company_id) {
                    $document->lead_id = null;
                }
                if ($document->opportunity_id && Opportunity::where('id', $document->opportunity_id)->value('company_id') != $document->company_id) {
                    $document->opportunity_id = null;
                }
                if ($document->request_id && Request::where('id', $document->request_id)->value('company_id') != $document->company_id) {
                    $document->request_id = null;
                }
                if ($document->task_id && Task::where('id', $document->task_id)->value('company_id') != $document->company_id) {
                    $document->task_id = null;
                }
            }

            if ($document->isDirty()) {
                $document->save();

                \App\Models\AuditLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'document.updated',
                    'subject_type' => Document::class,
                    'subject_id' => $document->id,
                    'old_values' => collect($oldValues)->only(array_keys($document->getChanges()))->toArray(),
                    'new_values' => $document->getChanges(),
                    'request_context' => [
                        'ip' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ],
                ]);
            }

            return $document;
        });
    }
}

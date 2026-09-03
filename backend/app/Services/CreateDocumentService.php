<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\FollowUp;
use App\Models\Note;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class CreateDocumentService
{
    protected ReferenceGeneratorService $referenceGenerator;

    public function __construct(ReferenceGeneratorService $referenceGenerator)
    {
        $this->referenceGenerator = $referenceGenerator;
    }

    public function execute(array $data, UploadedFile $file): Document
    {
        // Relationship Integrity Validation
        if (!empty($data['company_id'])) {
            $companyId = $data['company_id'];

            if (!empty($data['contact_id']) && Contact::where('id', $data['contact_id'])->value('company_id') != $companyId) {
                throw ValidationException::withMessages(['contact_id' => 'Contact does not belong to the selected company.']);
            }
            if (!empty($data['lead_id']) && Lead::where('id', $data['lead_id'])->value('company_id') != $companyId) {
                throw ValidationException::withMessages(['lead_id' => 'Lead does not belong to the selected company.']);
            }
            if (!empty($data['opportunity_id']) && Opportunity::where('id', $data['opportunity_id'])->value('company_id') != $companyId) {
                throw ValidationException::withMessages(['opportunity_id' => 'Opportunity does not belong to the selected company.']);
            }
            // Request/Task/FollowUp/Note logic can also be added here if they are directly scoped by company.
            if (!empty($data['request_id']) && Request::where('id', $data['request_id'])->value('company_id') != $companyId) {
                throw ValidationException::withMessages(['request_id' => 'Request does not belong to the selected company.']);
            }
            if (!empty($data['task_id']) && Task::where('id', $data['task_id'])->value('company_id') != $companyId) {
                throw ValidationException::withMessages(['task_id' => 'Task does not belong to the selected company.']);
            }
            if (!empty($data['follow_up_id'])) {
                // follow_ups are linked to specific entities, not directly to company unless we check polymorphic relations.
                // Assuming standard legendary logic for follow up if there is a company_id mapping we validate it.
                // Leave it generic for now.
            }
        }

        return DB::transaction(function () use ($data, $file) {
            $reference = $this->referenceGenerator->generate('LM-DOC-', 'documents', 'reference');
            
            $year = date('Y');
            $extension = $file->getClientOriginalExtension() ?: $file->guessExtension();
            $generatedName = Str::random(40) . '.' . $extension;
            $path = "documents/{$year}";

            // Store the file privately
            $storedPath = $file->storeAs($path, $generatedName, 'local');

            if (!$storedPath) {
                throw new \Exception('Failed to store document file securely.');
            }

            try {
                $document = Document::create([
                    'reference' => $reference,
                    'title' => $data['title'] ?? null,
                    'description' => $data['description'] ?? null,
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $storedPath,
                    'disk' => 'local',
                    'mime_type' => $file->getMimeType() ?? $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'created_by' => auth()->id(),
                    
                    'company_id' => $data['company_id'] ?? null,
                    'contact_id' => $data['contact_id'] ?? null,
                    'lead_id' => $data['lead_id'] ?? null,
                    'opportunity_id' => $data['opportunity_id'] ?? null,
                    'request_id' => $data['request_id'] ?? null,
                    'task_id' => $data['task_id'] ?? null,
                    'follow_up_id' => $data['follow_up_id'] ?? null,
                    'note_id' => $data['note_id'] ?? null,
                ]);

                \App\Models\AuditLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'document.created',
                    'subject_type' => Document::class,
                    'subject_id' => $document->id,
                    'new_values' => $document->toArray(),
                    'request_context' => [
                        'ip' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ],
                ]);

                return $document;
            } catch (\Exception $e) {
                // Atomic Create Cleanup
                Storage::disk('local')->delete($storedPath);
                throw $e;
            }
        });
    }
}

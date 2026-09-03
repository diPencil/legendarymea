<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Services\CreateDocumentService;
use App\Services\UpdateDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class DocumentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Document::class);
        
        $query = Document::with(['creator', 'company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'note']);

        // Filtering
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }
        if ($request->filled('contact_id')) {
            $query->where('contact_id', $request->contact_id);
        }
        if ($request->filled('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }
        if ($request->filled('opportunity_id')) {
            $query->where('opportunity_id', $request->opportunity_id);
        }
        if ($request->filled('request_id')) {
            $query->where('request_id', $request->request_id);
        }
        if ($request->filled('task_id')) {
            $query->where('task_id', $request->task_id);
        }
        if ($request->filled('follow_up_id')) {
            $query->where('follow_up_id', $request->follow_up_id);
        }
        if ($request->filled('note_id')) {
            $query->where('note_id', $request->note_id);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('original_name', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSorts = ['created_at', 'updated_at', 'reference', 'title', 'original_name', 'size'];
        $sort_by = $request->input('sort_by', 'created_at');
        $sort_direction = $request->input('sort_direction', 'desc');

        if (in_array($sort_by, $allowedSorts)) {
            $query->orderBy($sort_by, $sort_direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = $request->input('per_page', 15);
        $perPage = min(max((int)$perPage, 1), 100);

        return DocumentResource::collection($query->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreDocumentRequest $request, CreateDocumentService $service)
    {
        $this->authorize('create', Document::class);
        
        $document = $service->execute($request->validated(), $request->file('file'));

        $document->load(['creator', 'company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'note']);

        return new DocumentResource($document);
    }

    /**
     * Display the specified resource.
     */
    public function show(Document $document)
    {
        $this->authorize('view', $document);
        
        $document->load(['creator', 'company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'note']);
        
        return new DocumentResource($document);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateDocumentRequest $request, Document $document, UpdateDocumentService $service)
    {
        $this->authorize('update', $document);
        
        $document = $service->execute($document, $request->validated());
        
        $document->load(['creator', 'company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'note']);
        
        return new DocumentResource($document);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Document $document)
    {
        $this->authorize('delete', $document);
        
        $document->delete();

        \App\Models\AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'document.deleted',
            'subject_type' => Document::class,
            'subject_id' => $document->id,
            'request_context' => [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        return response()->noContent();
    }

    /**
     * Securely download the document.
     */
    public function download(Document $document)
    {
        $this->authorize('view', $document);

        if (!Storage::disk($document->disk)->exists($document->file_path)) {
            return response()->json(['message' => 'File not found on server.'], 404);
        }

        \App\Models\AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'document.downloaded',
            'subject_type' => Document::class,
            'subject_id' => $document->id,
            'request_context' => [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        return Storage::disk($document->disk)->download($document->file_path, $document->original_name);
    }
}

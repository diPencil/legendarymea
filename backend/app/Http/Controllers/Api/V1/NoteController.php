<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoteRequest;
use App\Http\Requests\UpdateNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Services\CreateNoteService;
use App\Services\UpdateNoteService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Note::class);

        $query = Note::with(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        $filters = ['company_id', 'contact_id', 'lead_id', 'opportunity_id', 'request_id', 'task_id', 'follow_up_id', 'created_by'];
        foreach ($filters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortWhitelist = ['reference', 'title', 'created_at', 'updated_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return NoteResource::collection($query->paginate($perPage));
    }

    public function store(StoreNoteRequest $request, CreateNoteService $service)
    {
        $this->authorize('create', Note::class);

        $note = $service->execute($request->validated(), $request->user()->id);
        $note->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'creator']);

        return response()->json([
            'message' => 'Note created',
            'data' => new NoteResource($note),
        ], 201);
    }

    public function show(Note $note)
    {
        $this->authorize('view', $note);

        $note->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'creator']);

        return new NoteResource($note);
    }

    public function update(UpdateNoteRequest $request, Note $note, UpdateNoteService $service)
    {
        $this->authorize('update', $note);

        $note = $service->execute($note, $request->validated(), $request->user()->id);
        $note->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'followUp', 'creator']);

        return response()->json([
            'message' => 'Note updated',
            'data' => new NoteResource($note),
        ]);
    }

    public function destroy(Note $note)
    {
        $this->authorize('delete', $note);

        $oldData = array_intersect_key($note->toArray(), array_flip([
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

        $note->delete();

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Note',
            entity: $note,
            oldValues: $oldData,
            newValues: null,
            metadata: [
                            'note_id' => $note->id,
                            'note_reference' => $note->reference,
                            'title' => $note->title,
                        ]
        );

        return response()->json(['message' => 'Note deleted']);
    }
}

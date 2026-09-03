<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Career;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CareerController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Career::class);

        $query = Career::query()->with('creator');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'title', 'location', 'status', 'closing_date', 'reference'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Career::class);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'location' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'required|string',
            'requirements' => 'nullable|string',
            'closing_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['reference'] = $this->generateReference();
        $validated['status'] = !empty($validated['is_active']) ? 'published' : 'draft';
        $validated['is_active'] = !empty($validated['is_active']);
        $validated['published_at'] = !empty($validated['is_active']) ? now() : null;
        $validated['created_by'] = $request->user()->id;
        $career = Career::create($validated);

        return response()->json(['data' => $career->load('creator')], 201);
    }

    public function show(Career $career)
    {
        Gate::authorize('view', $career);
        return response()->json(['data' => $career->load('creator')]);
    }

    public function update(Request $request, Career $career)
    {
        Gate::authorize('update', $career);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'location' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'required|string',
            'requirements' => 'nullable|string',
            'closing_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        if ($career->status === 'closed') {
            return response()->json(['message' => 'Closed jobs cannot be edited.'], 422);
        }

        if (array_key_exists('is_active', $validated)) {
            $validated['status'] = $validated['is_active'] ? 'published' : 'draft';
            $validated['published_at'] = $validated['is_active'] ? ($career->published_at ?? now()) : null;
        }

        $career->update($validated);

        return response()->json(['data' => $career->load('creator')]);
    }

    public function destroy(Career $career)
    {
        Gate::authorize('delete', $career);
        $career->delete();
        return response()->noContent();
    }

    public function publish(Career $career)
    {
        Gate::authorize('update', $career);

        if ($career->status !== 'draft') {
            return response()->json(['message' => 'Only draft jobs can be published.'], 422);
        }

        $career->update([
            'status' => 'published',
            'is_active' => true,
            'published_at' => now(),
        ]);

        return response()->json(['data' => $career->load('creator')]);
    }

    public function close(Career $career)
    {
        Gate::authorize('update', $career);

        if (!in_array($career->status, ['draft', 'published'], true)) {
            return response()->json(['message' => 'Only draft or published jobs can be closed.'], 422);
        }

        $career->update([
            'status' => 'closed',
            'is_active' => false,
        ]);

        return response()->json(['data' => $career->load('creator')]);
    }

    private function generateReference(): string
    {
        do {
            $reference = 'LM-CAR-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Career::query()->where('reference', $reference)->exists());

        return $reference;
    }
}

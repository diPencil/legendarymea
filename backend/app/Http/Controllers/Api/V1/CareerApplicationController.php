<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CareerApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CareerApplicationController extends Controller
{
    private const ALLOWED_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'interviewing', 'rejected', 'hired', 'withdrawn'];

    private const TRANSITIONS = [
        'new' => ['reviewing', 'rejected', 'withdrawn'],
        'reviewing' => ['shortlisted', 'interview', 'rejected', 'withdrawn'],
        'shortlisted' => ['interview', 'rejected', 'withdrawn'],
        'interview' => ['hired', 'rejected', 'withdrawn'],
        'rejected' => [],
        'hired' => [],
        'withdrawn' => [],
    ];

    public function index(Request $request)
    {
        Gate::authorize('viewAny', CareerApplication::class);

        $query = CareerApplication::query()->with(['career', 'assignee']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('career_id')) {
            $query->where('career_id', $request->career_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('assigned_to')) {
            if ($request->string('assigned_to')->lower()->value() === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $request->integer('assigned_to'));
            }
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'name', 'status', 'reference'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    public function show(CareerApplication $careerApplication)
    {
        Gate::authorize('view', $careerApplication);
        $careerApplication->load(['career', 'assignee']);
        return response()->json(['data' => $careerApplication]);
    }

    public function update(Request $request, CareerApplication $careerApplication)
    {
        Gate::authorize('update', $careerApplication);

        $validated = $request->validate([
            'status' => ['sometimes', 'required', Rule::in(self::ALLOWED_STATUSES)],
            'assigned_to' => 'nullable|exists:users,id',
            'internal_notes' => 'nullable|string',
        ]);

        if (array_key_exists('status', $validated)) {
            $validated['status'] = $validated['status'] === 'interviewing' ? 'interview' : $validated['status'];
        }

        if (array_key_exists('status', $validated) && !$this->canTransition($careerApplication->status, $validated['status'])) {
            return response()->json(['message' => 'Invalid application status transition.'], 422);
        }

        $careerApplication->update($validated);

        return response()->json(['data' => $careerApplication->load(['career', 'assignee'])]);
    }

    public function destroy(CareerApplication $careerApplication)
    {
        Gate::authorize('delete', $careerApplication);
        $careerApplication->delete();
        return response()->noContent();
    }

    public function downloadResume(CareerApplication $careerApplication)
    {
        Gate::authorize('view', $careerApplication);

        if (!$careerApplication->resume_path || !\Illuminate\Support\Facades\Storage::disk('local')->exists($careerApplication->resume_path)) {
            abort(404, 'Resume not found.');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($careerApplication->resume_path, $careerApplication->name . '_resume.pdf');
    }

    private function canTransition(string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }
}

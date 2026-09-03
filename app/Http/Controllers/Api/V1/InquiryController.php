<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\InquiryStatus;
use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InquiryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Inquiry::class);

        $query = Inquiry::query()->with(['assignee', 'creator']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'reference', 'name', 'email', 'status'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', Inquiry::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'status' => ['sometimes', Rule::enum(InquiryStatus::class)],
            'internal_notes' => 'nullable|string',
        ]);

        $validated['reference'] = 'LM-INQ-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
        $validated['status'] = $validated['status'] ?? InquiryStatus::NEW;
        if ($validated['status'] === InquiryStatus::RESOLVED->value) {
            $validated['resolved_at'] = now();
        }
        $validated['created_by'] = $request->user()->id;

        $inquiry = Inquiry::create($validated);

        return response()->json(['data' => $inquiry->load(['assignee', 'creator'])], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Inquiry $inquiry)
    {
        Gate::authorize('view', $inquiry);
        
        $inquiry->load(['assignee', 'creator']);
        return response()->json(['data' => $inquiry]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Inquiry $inquiry)
    {
        Gate::authorize('update', $inquiry);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'status' => ['sometimes', Rule::enum(InquiryStatus::class)],
            'internal_notes' => 'nullable|string',
        ]);

        if (array_key_exists('status', $validated)) {
            if ($validated['status'] === InquiryStatus::RESOLVED->value && $inquiry->status !== InquiryStatus::RESOLVED) {
                $validated['resolved_at'] = now();
            } elseif ($validated['status'] !== InquiryStatus::RESOLVED->value && $inquiry->status === InquiryStatus::RESOLVED) {
                $validated['resolved_at'] = null;
            }
        }

        $inquiry->update($validated);

        return response()->json(['data' => $inquiry->load(['assignee', 'creator'])]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Inquiry $inquiry)
    {
        Gate::authorize('delete', $inquiry);
        $inquiry->delete();
        return response()->noContent();
    }

    public function assign(Request $request, Inquiry $inquiry)
    {
        Gate::authorize('update', $inquiry);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $inquiry->update([
            'assigned_to' => $validated['user_id'],
        ]);

        return response()->json(['data' => $inquiry->load(['assignee', 'creator'])]);
    }

    public function unassign(Request $request, Inquiry $inquiry)
    {
        Gate::authorize('update', $inquiry);

        $inquiry->update([
            'assigned_to' => null,
        ]);

        return response()->json(['data' => $inquiry->load(['assignee', 'creator'])]);
    }

    public function status(Request $request, Inquiry $inquiry)
    {
        Gate::authorize('update', $inquiry);

        $validated = $request->validate([
            'status' => ['required', Rule::enum(InquiryStatus::class)],
        ]);

        $updateData = ['status' => $validated['status']];
        if ($validated['status'] === InquiryStatus::RESOLVED->value) {
            $updateData['resolved_at'] = now();
        } elseif ($inquiry->status === InquiryStatus::RESOLVED) {
            $updateData['resolved_at'] = null;
        }

        $inquiry->update($updateData);

        return response()->json(['data' => $inquiry->load(['assignee', 'creator'])]);
    }
}

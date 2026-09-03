<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use App\Http\Requests\AssignLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Services\CreateLeadService;
use App\Services\UpdateLeadService;
use App\Services\AssignLeadService;
use App\Services\ConvertLeadService;
use App\Http\Requests\ConvertLeadRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class LeadController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CreateLeadService $createService,
        private UpdateLeadService $updateService,
        private AssignLeadService $assignService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Lead::class);

        $query = Lead::with(['company', 'contact', 'assignedTo.user']);

        // Apply Scope Visibility
        $user = Auth::user();
        if (!$user->hasRole(['super_admin', 'admin', 'manager'])) {
            $query->where(function($q) use ($user) {
                $q->where('assigned_to', $user->employee?->id)
                  ->orWhere('created_by', $user->id);
            });
        }

        // Search & Filters
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('person_name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('service_interest')) {
            $query->where('service_interest', $request->service_interest);
        }

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $sortField = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['created_at', 'reference', 'estimated_value', 'next_follow_up_at'];
        if (in_array($sortField, $allowedSorts) && in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $query->orderBy($sortField, $sortOrder);
        }

        return LeadResource::collection($query->paginate($request->input('per_page', 15)));
    }

    public function store(StoreLeadRequest $request)
    {
        $this->authorize('create', Lead::class);
        $lead = $this->createService->execute($request->validated());
        $lead->load(['company', 'contact', 'assignedTo.user']);
        return new LeadResource($lead);
    }

    public function show(Lead $lead)
    {
        $this->authorize('view', $lead);
        $lead->load(['company', 'contact', 'assignedTo.user']);
        return new LeadResource($lead);
    }

    public function update(UpdateLeadRequest $request, Lead $lead)
    {
        $this->authorize('update', $lead);
        $lead = $this->updateService->execute($lead, $request->validated());
        $lead->load(['company', 'contact', 'assignedTo.user']);
        return new LeadResource($lead);
    }

    public function destroy(Lead $lead)
    {
        $this->authorize('delete', $lead);
        $oldValues = $lead->toArray();
        $lead->delete();

        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => 'lead.deleted',
            'subject_type' => Lead::class,
            'subject_id' => $lead->id,
            'old_values' => $oldValues,
            'new_values' => null,
            'request_context' => [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        CrmActivity::create([
            'company_id' => $lead->company_id,
            'actor_id' => Auth::id(),
            'subject_type' => Lead::class,
            'subject_id' => $lead->id,
            'type' => 'lead.deleted',
            'metadata' => [
                'lead_reference' => $lead->reference,
            ],
        ]);

        return response()->noContent();
    }

    public function assign(AssignLeadRequest $request, Lead $lead)
    {
        $this->authorize('update', $lead);
        $lead = $this->assignService->execute($lead, $request->validated());
        $lead->load(['company', 'contact', 'assignedTo.user']);
        return new LeadResource($lead);
    }

    public function convert(ConvertLeadRequest $request, Lead $lead, ConvertLeadService $convertService)
    {
        $this->authorize('convert', $lead);
        $result = $convertService->execute($lead, $request->validated(), Auth::id());
        
        return response()->json([
            'success' => true,
            'message' => __('lead.converted'),
            'data' => [
                'lead' => new LeadResource($result['lead']),
                'company' => new \App\Http\Resources\CompanyResource($result['company']),
                'contact' => $result['contact'] ? new \App\Http\Resources\ContactResource($result['contact']) : null,
                'opportunity' => new \App\Http\Resources\OpportunityResource($result['opportunity'])
            ]
        ], 200);
    }
}

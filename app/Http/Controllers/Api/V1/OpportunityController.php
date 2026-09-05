<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Models\Opportunity;
use App\Support\PermissionAccess;
use App\Http\Requests\StoreOpportunityRequest;
use App\Http\Requests\UpdateOpportunityRequest;
use App\Http\Requests\AssignOpportunityRequest;
use App\Http\Requests\ChangeOpportunityStageRequest;
use App\Http\Resources\OpportunityResource;
use App\Services\CreateOpportunityService;
use App\Services\UpdateOpportunityService;
use App\Services\AssignOpportunityService;
use App\Services\ChangeOpportunityStageService;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class OpportunityController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Opportunity::class);

        $query = Opportunity::with(['company', 'primaryContact', 'owner.user', 'sourceLead']);

        // Employee visibility scope
        $user = $request->user();
        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'opportunities')) {
            $query->where('owner_id', $user->employee->id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhereHas('company', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('primaryContact', function ($q) use ($search) {
                      $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        $filters = ['stage', 'owner_id', 'company_id', 'primary_contact_id', 'lead_id', 'service_interest', 'currency'];
        foreach ($filters as $filter) {
            if ($request->has($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->has('close_from')) {
            $query->whereDate('expected_close_date', '>=', $request->input('close_from'));
        }
        if ($request->has('close_to')) {
            $query->whereDate('expected_close_date', '<=', $request->input('close_to'));
        }

        if ($request->has('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->has('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        // Sorting
        $sortWhitelist = ['reference', 'name', 'stage', 'probability', 'estimated_value', 'expected_close_date', 'created_at', 'updated_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        if (in_array($sortBy, $sortWhitelist) && in_array(strtolower($sortDir), ['asc', 'desc'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $opportunities = $query->paginate($perPage);

        return OpportunityResource::collection($opportunities);
    }

    public function store(StoreOpportunityRequest $request, CreateOpportunityService $service)
    {
        $this->authorize('create', Opportunity::class);
        $opportunity = $service->execute($request->validated(), $request->user()->id);
        $opportunity->load(['company', 'primaryContact', 'owner.user', 'sourceLead']);
        
        return response()->json([
            'message' => __('opportunity.created'),
            'data' => new OpportunityResource($opportunity),
        ], 201);
    }

    public function show(Opportunity $opportunity)
    {
        $this->authorize('view', $opportunity);
        $opportunity->load(['company', 'primaryContact', 'owner.user', 'sourceLead']);
        return new OpportunityResource($opportunity);
    }

    public function update(UpdateOpportunityRequest $request, Opportunity $opportunity, UpdateOpportunityService $service)
    {
        $this->authorize('update', $opportunity);
        $opportunity = $service->execute($opportunity, $request->validated(), $request->user()->id);
        $opportunity->load(['company', 'primaryContact', 'owner.user', 'sourceLead']);
        
        return response()->json([
            'message' => __('opportunity.updated'),
            'data' => new OpportunityResource($opportunity),
        ]);
    }

    public function destroy(Opportunity $opportunity)
    {
        $this->authorize('delete', $opportunity);
        $opportunity->delete();
        
        \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Opportunity',
            entity: $opportunity,
            oldValues: $opportunity->toArray(),
            newValues: null,
            metadata: ['opportunity_id' => $opportunity->id]
        );

        return response()->json(['message' => __('opportunity.deleted')]);
    }

    public function assign(AssignOpportunityRequest $request, Opportunity $opportunity, AssignOpportunityService $service)
    {
        $this->authorize('assign', $opportunity);
        $opportunity = $service->execute($opportunity, $request->input('owner_id'), $request->user()->id);
        $opportunity->load(['company', 'primaryContact', 'owner.user', 'sourceLead']);
        
        return response()->json([
            'message' => __('opportunity.assigned'),
            'data' => new OpportunityResource($opportunity),
        ]);
    }

    public function stage(ChangeOpportunityStageRequest $request, Opportunity $opportunity, ChangeOpportunityStageService $service)
    {
        $this->authorize('update', $opportunity);
        
        $newStage = $request->input('stage');
        $oldStage = $opportunity->stage->value;

        $opportunity = $service->execute(
            $opportunity,
            $newStage,
            $request->input('lost_reason'),
            $request->user()->id
        );

        $opportunity->load(['company', 'primaryContact', 'owner.user', 'sourceLead']);
        
        $messageKey = 'opportunity.stage_changed';
        if ($newStage === \App\Enums\OpportunityStage::WON->value) {
            $messageKey = 'opportunity.won';
        } elseif ($newStage === \App\Enums\OpportunityStage::LOST->value) {
            $messageKey = 'opportunity.lost';
        } elseif (in_array($oldStage, [\App\Enums\OpportunityStage::WON->value, \App\Enums\OpportunityStage::LOST->value]) && 
            !in_array($newStage, [\App\Enums\OpportunityStage::WON->value, \App\Enums\OpportunityStage::LOST->value])) {
            $messageKey = 'opportunity.reopened';
        }

        return response()->json([
            'message' => __($messageKey),
            'data' => new OpportunityResource($opportunity),
        ]);
    }
}

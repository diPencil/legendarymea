<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActiveServiceRequest;
use App\Http\Requests\UpdateActiveServiceRequest;
use App\Http\Resources\ActiveServiceResource;
use App\Models\ActiveService;
use App\Services\ActiveServiceLifecycleService;
use App\Services\CreateActiveServiceService;
use App\Services\UpdateActiveServiceService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ActiveServiceController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', ActiveService::class);

        $query = ActiveService::with(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']);

        if ($request->filled('reference')) {
            $query->where('reference', 'like', '%' . $request->reference . '%');
        }
        if ($request->filled('title')) {
            $query->where('title', 'like', '%' . $request->title . '%');
        }
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }
        if ($request->filled('contract_id')) {
            $query->where('contract_id', $request->contract_id);
        }
        if ($request->filled('client_onboarding_id')) {
            $query->where('client_onboarding_id', $request->client_onboarding_id);
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('start_from')) {
            $query->whereDate('start_date', '>=', $request->start_from);
        }
        if ($request->filled('start_to')) {
            $query->whereDate('start_date', '<=', $request->start_to);
        }
        if ($request->filled('end_from')) {
            $query->whereDate('end_date', '>=', $request->end_from);
        }
        if ($request->filled('end_to')) {
            $query->whereDate('end_date', '<=', $request->end_to);
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->created_from);
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->created_to);
        }

        $sortable = ['created_at', 'updated_at', 'reference', 'title', 'status', 'start_date', 'end_date'];
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');

        if (in_array($sort, $sortable) && in_array(strtolower($direction), ['asc', 'desc'])) {
            $query->orderBy($sort, $direction);
        }

        $services = $query->paginate($request->input('per_page', 15));

        return ActiveServiceResource::collection($services);
    }

    public function store(StoreActiveServiceRequest $request, CreateActiveServiceService $service)
    {
        Gate::authorize('create', ActiveService::class);
        $activeService = $service->execute($request->validated(), $request->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function show(ActiveService $activeService)
    {
        Gate::authorize('view', $activeService);
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function update(UpdateActiveServiceRequest $request, ActiveService $activeService, UpdateActiveServiceService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->execute($activeService, $request->validated(), $request->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function destroy(ActiveService $activeService)
    {
        Gate::authorize('delete', $activeService);
        
        if (in_array($activeService->status->value, ['active', 'suspended', 'ended'])) {
            return response()->json(['message' => 'Cannot delete active, suspended, or ended service.'], 403);
        }

        $activeService->delete();

        // Audit log for deletion
        \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'ActiveService',
            entity: $activeService,
            oldValues: $activeService->toArray(),
            newValues: [],
            metadata: []
        );

        return response()->noContent();
    }

    public function activate(ActiveService $activeService, ActiveServiceLifecycleService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->activate($activeService, request()->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function suspend(ActiveService $activeService, ActiveServiceLifecycleService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->suspend($activeService, request()->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function resume(ActiveService $activeService, ActiveServiceLifecycleService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->resume($activeService, request()->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function end(ActiveService $activeService, ActiveServiceLifecycleService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->end($activeService, request()->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }

    public function cancel(ActiveService $activeService, ActiveServiceLifecycleService $service)
    {
        Gate::authorize('update', $activeService);
        $activeService = $service->cancel($activeService, request()->user());
        return new ActiveServiceResource($activeService->load(['serviceCatalog', 'company', 'contract', 'clientOnboarding', 'assignee', 'creator']));
    }
}

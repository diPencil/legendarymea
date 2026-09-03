<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ClientOnboardingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientOnboardingRequest;
use App\Http\Requests\UpdateClientOnboardingRequest;
use App\Http\Resources\ClientOnboardingResource;
use App\Models\ClientOnboarding;
use App\Models\AuditLog;
use App\Services\ClientOnboardingLifecycleService;
use App\Services\CreateClientOnboardingService;
use App\Services\UpdateClientOnboardingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ClientOnboardingController extends Controller
{
    use \Illuminate\Foundation\Auth\Access\AuthorizesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ClientOnboarding::class);

        $query = ClientOnboarding::with(['company', 'contract', 'assignee', 'creator']);

        if ($request->has('reference')) {
            $query->where('reference', 'like', '%' . $request->input('reference') . '%');
        }

        if ($request->has('company_id')) {
            $query->where('company_id', $request->input('company_id'));
        }

        if ($request->has('contract_id')) {
            $query->where('contract_id', $request->input('contract_id'));
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }

        if ($request->has('created_by')) {
            $query->where('created_by', $request->input('created_by'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('kickoff_from')) {
            $query->whereDate('kickoff_date', '>=', $request->input('kickoff_from'));
        }
        if ($request->has('kickoff_to')) {
            $query->whereDate('kickoff_date', '<=', $request->input('kickoff_to'));
        }

        if ($request->has('target_go_live_from')) {
            $query->whereDate('target_go_live_date', '>=', $request->input('target_go_live_from'));
        }
        if ($request->has('target_go_live_to')) {
            $query->whereDate('target_go_live_date', '<=', $request->input('target_go_live_to'));
        }

        if ($request->has('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->has('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortField = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSorts = [
            'created_at', 'updated_at', 'reference', 'status',
            'kickoff_date', 'target_go_live_date', 'completed_at'
        ];

        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        return ClientOnboardingResource::collection($query->paginate($request->input('per_page', 15)));
    }

    public function store(StoreClientOnboardingRequest $request, CreateClientOnboardingService $service): ClientOnboardingResource
    {
        $this->authorize('create', ClientOnboarding::class);

        $onboarding = $service->execute($request->validated(), $request->user());

        $onboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($onboarding);
    }

    public function show(ClientOnboarding $clientOnboarding): ClientOnboardingResource
    {
        $this->authorize('view', $clientOnboarding);

        $clientOnboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($clientOnboarding);
    }

    public function update(UpdateClientOnboardingRequest $request, ClientOnboarding $clientOnboarding, UpdateClientOnboardingService $service): ClientOnboardingResource
    {
        $this->authorize('update', $clientOnboarding);

        $onboarding = $service->execute($clientOnboarding, $request->validated(), $request->user());

        $onboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($onboarding);
    }

    public function start(ClientOnboarding $clientOnboarding, ClientOnboardingLifecycleService $service): ClientOnboardingResource
    {
        $this->authorize('update', $clientOnboarding);

        $onboarding = $service->start($clientOnboarding, request()->user());

        $onboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($onboarding);
    }

    public function complete(ClientOnboarding $clientOnboarding, ClientOnboardingLifecycleService $service): ClientOnboardingResource
    {
        $this->authorize('update', $clientOnboarding);

        $onboarding = $service->complete($clientOnboarding, request()->user());

        $onboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($onboarding);
    }

    public function cancel(ClientOnboarding $clientOnboarding, ClientOnboardingLifecycleService $service): ClientOnboardingResource
    {
        $this->authorize('update', $clientOnboarding);

        $onboarding = $service->cancel($clientOnboarding, request()->user());

        $onboarding->load(['company', 'contract', 'assignee', 'creator']);

        return new ClientOnboardingResource($onboarding);
    }

    public function destroy(ClientOnboarding $clientOnboarding): Response
    {
        $this->authorize('delete', $clientOnboarding);

        if (in_array($clientOnboarding->status, [ClientOnboardingStatus::IN_PROGRESS, ClientOnboardingStatus::COMPLETED])) {
            abort(403, 'Cannot delete in-progress or completed onboarding.');
        }

        $original = $clientOnboarding->toArray();

        $clientOnboarding->delete();

        AuditLog::create([
            'user_id' => request()->user()->id,
            'action' => 'client_onboarding.deleted',
            'subject_type' => ClientOnboarding::class,
            'subject_id' => $clientOnboarding->id,
            'old_values' => ['reference' => $clientOnboarding->reference],
        ]);

        return response()->noContent();
    }
}

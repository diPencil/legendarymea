<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignRequestRequest;
use App\Http\Requests\StoreRequestRequest;
use App\Http\Requests\UpdateRequestRequest;
use App\Http\Resources\RequestResource;
use App\Models\Request as BusinessRequest;
use App\Support\PermissionAccess;
use App\Services\AssignRequestService;
use App\Services\CreateRequestService;
use App\Services\UpdateRequestService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class RequestController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', BusinessRequest::class);

        $query = BusinessRequest::with(['company', 'contact', 'opportunity', 'assignedTo.user', 'createdBy']);

        $user = $request->user();
        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'requests')) {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->employee?->id)
                    ->orWhere('created_by', $user->id);
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $filters = ['status', 'priority', 'service_interest', 'company_id', 'contact_id', 'opportunity_id', 'assigned_to'];
        foreach ($filters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('due_from')) {
            $query->whereDate('due_at', '>=', $request->input('due_from'));
        }
        if ($request->filled('due_to')) {
            $query->whereDate('due_at', '<=', $request->input('due_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortWhitelist = ['reference', 'title', 'status', 'priority', 'due_at', 'created_at', 'updated_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return RequestResource::collection($query->paginate($perPage));
    }

    public function store(StoreRequestRequest $request, CreateRequestService $service)
    {
        $this->authorize('create', BusinessRequest::class);

        $businessRequest = $service->execute($request->validated(), $request->user()->id);
        $businessRequest->load(['company', 'contact', 'opportunity', 'assignedTo.user', 'createdBy']);

        return response()->json([
            'message' => __('request.created'),
            'data' => new RequestResource($businessRequest),
        ], 201);
    }

    public function show(BusinessRequest $businessRequest)
    {
        $this->authorize('view', $businessRequest);
        $this->authorizeEmployeeScope($businessRequest);

        $businessRequest->load(['company', 'contact', 'opportunity', 'assignedTo.user', 'createdBy']);

        return new RequestResource($businessRequest);
    }

    public function update(UpdateRequestRequest $request, BusinessRequest $businessRequest, UpdateRequestService $service)
    {
        $this->authorize('update', $businessRequest);

        $businessRequest = $service->execute($businessRequest, $request->validated(), $request->user()->id);
        $businessRequest->load(['company', 'contact', 'opportunity', 'assignedTo.user', 'createdBy']);

        return response()->json([
            'message' => __('request.updated'),
            'data' => new RequestResource($businessRequest),
        ]);
    }

    public function destroy(BusinessRequest $businessRequest)
    {
        $this->authorize('delete', $businessRequest);

        $oldData = array_intersect_key($businessRequest->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'opportunity_id',
            'assigned_to',
            'title',
            'service_interest',
            'status',
            'priority',
            'due_at',
            'started_at',
            'completed_at',
            'created_by',
        ]));

        $businessRequest->delete();

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Request',
            entity: $businessRequest,
            oldValues: $oldData,
            newValues: null,
            metadata: [
                        'request_id' => $businessRequest->id,
                        'request_reference' => $businessRequest->reference,
                    ]
        );

        return response()->json(['message' => __('request.deleted')]);
    }

    public function assign(AssignRequestRequest $request, BusinessRequest $businessRequest, AssignRequestService $service)
    {
        $this->authorize('assign', $businessRequest);

        $businessRequest = $service->execute(
            $businessRequest,
            (int) $request->input('assigned_to'),
            $request->user()->id
        );
        $businessRequest->load(['company', 'contact', 'opportunity', 'assignedTo.user', 'createdBy']);

        return response()->json([
            'message' => __('request.assigned'),
            'data' => new RequestResource($businessRequest),
        ]);
    }

    private function authorizeEmployeeScope(BusinessRequest $request): void
    {
        $user = auth()->user();

        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'requests')) {
            abort_unless(
                $request->assigned_to === $user->employee?->id || $request->created_by === $user->id,
                403
            );
        }
    }
}

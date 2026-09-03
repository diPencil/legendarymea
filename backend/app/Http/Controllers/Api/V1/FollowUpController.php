<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignFollowUpRequest;
use App\Http\Requests\StoreFollowUpRequest;
use App\Http\Requests\UpdateFollowUpRequest;
use App\Http\Resources\FollowUpResource;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\FollowUp;
use App\Support\PermissionAccess;
use App\Services\AssignFollowUpService;
use App\Services\CreateFollowUpService;
use App\Services\UpdateFollowUpService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class FollowUpController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', FollowUp::class);

        $query = FollowUp::with(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'assignee.user', 'creator']);

        $user = $request->user();
        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'follow_ups')) {
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
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $filters = ['status', 'company_id', 'contact_id', 'lead_id', 'opportunity_id', 'request_id', 'task_id', 'assigned_to'];
        foreach ($filters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('follow_up_from')) {
            $query->whereDate('follow_up_at', '>=', $request->input('follow_up_from'));
        }
        if ($request->filled('follow_up_to')) {
            $query->whereDate('follow_up_at', '<=', $request->input('follow_up_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        if ($request->filled('overdue') && $request->boolean('overdue')) {
            $query->where('status', \App\Enums\FollowUpStatus::PENDING)
                ->where('follow_up_at', '<', now());
        }

        $sortWhitelist = ['reference', 'title', 'status', 'follow_up_at', 'created_at', 'updated_at', 'completed_at'];
        $sortBy = $request->input('sort_by', 'follow_up_at');
        $sortDir = strtolower($request->input('sort_dir', 'asc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('follow_up_at', 'asc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return FollowUpResource::collection($query->paginate($perPage));
    }

    public function store(StoreFollowUpRequest $request, CreateFollowUpService $service)
    {
        $this->authorize('create', FollowUp::class);

        $followUp = $service->execute($request->validated(), $request->user()->id);
        $followUp->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Follow-up created',
            'data' => new FollowUpResource($followUp),
        ], 201);
    }

    public function show(FollowUp $followUp)
    {
        $this->authorize('view', $followUp);
        $this->authorizeEmployeeScope($followUp);

        $followUp->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'assignee.user', 'creator']);

        return new FollowUpResource($followUp);
    }

    public function update(UpdateFollowUpRequest $request, FollowUp $followUp, UpdateFollowUpService $service)
    {
        $this->authorize('update', $followUp);
        $this->authorizeEmployeeScope($followUp);

        $followUp = $service->execute($followUp, $request->validated(), $request->user()->id);
        $followUp->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Follow-up updated',
            'data' => new FollowUpResource($followUp),
        ]);
    }

    public function destroy(FollowUp $followUp)
    {
        $this->authorize('delete', $followUp);
        $this->authorizeEmployeeScope($followUp);

        $oldData = array_intersect_key($followUp->toArray(), array_flip([
            'id',
            'reference',
            'company_id',
            'contact_id',
            'lead_id',
            'opportunity_id',
            'request_id',
            'task_id',
            'assigned_to',
            'title',
            'notes',
            'status',
            'follow_up_at',
            'completed_at',
            'created_by',
        ]));

        $followUp->delete();

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'follow_up.deleted',
            'subject_type' => FollowUp::class,
            'subject_id' => $followUp->id,
            'old_values' => $oldData,
            'new_values' => null,
            'request_context' => [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        CrmActivity::create([
            'actor_id' => auth()->id(),
            'type' => 'follow_up.deleted',
            'subject_type' => FollowUp::class,
            'subject_id' => $followUp->id,
            'company_id' => $followUp->company_id,
            'metadata' => [
                'follow_up_id' => $followUp->id,
                'follow_up_reference' => $followUp->reference,
            ],
        ]);

        return response()->json(['message' => 'Follow-up deleted']);
    }

    public function assign(AssignFollowUpRequest $request, FollowUp $followUp, AssignFollowUpService $service)
    {
        $this->authorize('assign', $followUp);
        $this->authorizeEmployeeScope($followUp);

        $employeeId = $request->input('assigned_to');
        if ($employeeId !== null) {
            $employeeId = (int)$employeeId;
        }

        $followUp = $service->execute(
            $followUp,
            $employeeId,
            $request->user()->id
        );
        $followUp->load(['company', 'contact', 'lead', 'opportunity', 'request', 'task', 'assignee.user', 'creator']);

        return response()->json([
            'message' => 'Follow-up assigned',
            'data' => new FollowUpResource($followUp),
        ]);
    }

    private function authorizeEmployeeScope(FollowUp $followUp): void
    {
        $user = auth()->user();

        if ($user->hasRole('employee') && ! PermissionAccess::canUpdate($user, 'follow_ups')) {
            abort_unless(
                $followUp->assigned_to === $user->employee?->id || $followUp->created_by === $user->id,
                403
            );
        }
    }
}

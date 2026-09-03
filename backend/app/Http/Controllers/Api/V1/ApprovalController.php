<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Approval;
use App\Http\Resources\ApprovalResource;
use App\Http\Requests\StoreApprovalRequest;
use App\Http\Requests\UpdateApprovalRequest;
use App\Http\Requests\AssignApprovalRequest;
use App\Http\Requests\DecisionApprovalRequest;
use App\Services\CreateApprovalService;
use App\Services\AssignApprovalService;
use App\Services\ApprovalDecisionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class ApprovalController extends Controller
{
    use \Illuminate\Foundation\Auth\Access\AuthorizesRequests;

    public function __construct(
        private CreateApprovalService $createService,
        private AssignApprovalService $assignService,
        private ApprovalDecisionService $decisionService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Approval::class);

        $query = Approval::with(['quotation', 'requester', 'assignee', 'decider']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('quotation_id')) {
            $query->where('quotation_id', $request->input('quotation_id'));
        }
        if ($request->filled('requested_by')) {
            $query->where('requested_by', $request->input('requested_by'));
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }
        if ($request->filled('decided_by')) {
            $query->where('decided_by', $request->input('decided_by'));
        }
        if ($request->filled('reference')) {
            $query->where('reference', $request->input('reference'));
        }
        if ($request->filled('requested_from')) {
            $query->requestedFrom($request->input('requested_from'));
        }
        if ($request->filled('requested_to')) {
            $query->requestedTo($request->input('requested_to'));
        }

        $sortWhitelist = ['created_at', 'updated_at', 'reference', 'status', 'requested_at', 'decided_at'];
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return ApprovalResource::collection($query->paginate($perPage));
    }

    public function store(StoreApprovalRequest $request): ApprovalResource
    {
        $this->authorize('create', Approval::class);
        $approval = $this->createService->execute($request->validated(), $request->user());
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee']));
    }

    public function show(Approval $approval): ApprovalResource
    {
        $this->authorize('view', $approval);
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee', 'decider']));
    }

    public function update(UpdateApprovalRequest $request, Approval $approval): ApprovalResource
    {
        $this->authorize('update', $approval);

        $approval->update($request->validated());

        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee', 'decider']));
    }

    public function destroy(Approval $approval)
    {
        $this->authorize('delete', $approval);

        if (!in_array($approval->status->value, ['cancelled'])) {
            throw ValidationException::withMessages([
                'status' => 'Only cancelled approvals can be deleted.'
            ]);
        }

        $approval->delete();

        return response()->noContent();
    }

    public function assign(AssignApprovalRequest $request, Approval $approval): ApprovalResource
    {
        $this->authorize('update', $approval);
        $approval = $this->assignService->execute($approval, $request->validated(), $request->user());
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee']));
    }

    public function approve(DecisionApprovalRequest $request, Approval $approval): ApprovalResource
    {
        $this->authorize('decide', $approval);
        $approval = $this->decisionService->approve($approval, $request->validated(), $request->user());
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee', 'decider']));
    }

    public function reject(DecisionApprovalRequest $request, Approval $approval): ApprovalResource
    {
        $this->authorize('decide', $approval);
        $approval = $this->decisionService->reject($approval, $request->validated(), $request->user());
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee', 'decider']));
    }

    public function cancel(Request $request, Approval $approval): ApprovalResource
    {
        $this->authorize('update', $approval);
        $approval = $this->decisionService->cancel($approval, $request->user());
        return new ApprovalResource($approval->load(['quotation', 'requester', 'assignee', 'decider']));
    }
}

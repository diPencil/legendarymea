<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\RenewalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteRenewalRequest;
use App\Http\Requests\StoreRenewalRequest;
use App\Http\Requests\UpdateRenewalRequest;
use App\Http\Resources\RenewalResource;
use App\Models\AuditLog;
use App\Models\Renewal;
use App\Services\CreateRenewalService;
use App\Services\RenewalLifecycleService;
use App\Services\UpdateRenewalService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class RenewalController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Renewal::class);

        $query = Renewal::with(['company', 'contract', 'activeService', 'assignee', 'renewedContract', 'creator']);

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search) {
                $builder->where('reference', 'like', '%' . $search . '%')
                    ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', '%' . $search . '%'))
                    ->orWhereHas('contract', fn ($contractQuery) => $contractQuery->where('reference', 'like', '%' . $search . '%')->orWhere('title', 'like', '%' . $search . '%'));
            });
        }

        foreach (['status', 'company_id', 'contract_id', 'active_service_id', 'assigned_to', 'currency'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $filter === 'currency' ? strtoupper($request->string($filter)->toString()) : $request->input($filter));
            }
        }

        if ($request->filled('due_from')) {
            $query->whereDate('renewal_due_date', '>=', $request->input('due_from'));
        }
        if ($request->filled('due_to')) {
            $query->whereDate('renewal_due_date', '<=', $request->input('due_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortBy = in_array($request->input('sort_by'), ['created_at', 'reference', 'renewal_due_date', 'renewal_amount', 'status'], true)
            ? $request->input('sort_by')
            : 'created_at';
        $sortOrder = $request->input('sort_order') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return RenewalResource::collection($query->paginate((int) $request->input('per_page', 15)));
    }

    public function store(StoreRenewalRequest $request, CreateRenewalService $service)
    {
        Gate::authorize('create', Renewal::class);
        return new RenewalResource($service->execute($request->validated(), $request->user()->id));
    }

    public function show(Renewal $renewal)
    {
        Gate::authorize('view', $renewal);
        return new RenewalResource($renewal->load(['company', 'contract', 'activeService', 'assignee', 'renewedContract', 'creator']));
    }

    public function update(UpdateRenewalRequest $request, Renewal $renewal, UpdateRenewalService $service)
    {
        Gate::authorize('update', $renewal);
        return new RenewalResource($service->execute($renewal->load('contract'), $request->validated(), $request->user()->id));
    }

    public function destroy(Renewal $renewal): Response
    {
        Gate::authorize('delete', $renewal);

        if (!in_array($renewal->status, [RenewalStatus::UPCOMING, RenewalStatus::CANCELLED], true)) {
            abort(422, 'Only upcoming or cancelled renewals can be deleted.');
        }

        $renewal->delete();

        AuditLog::create([
            'user_id' => request()->user()->id,
            'action' => 'renewal.deleted',
            'subject_type' => Renewal::class,
            'subject_id' => $renewal->id,
            'old_values' => ['reference' => $renewal->reference, 'status' => $renewal->status->value],
            'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
        ]);

        return response()->noContent();
    }

    public function markDue(Renewal $renewal, Request $request, RenewalLifecycleService $service)
    {
        Gate::authorize('update', $renewal);
        return new RenewalResource($service->markDue($renewal, $request->user()->id));
    }

    public function complete(CompleteRenewalRequest $request, Renewal $renewal, RenewalLifecycleService $service)
    {
        Gate::authorize('update', $renewal);
        return new RenewalResource($service->complete($renewal, $request->validated()['renewed_contract_id'], $request->user()->id));
    }

    public function decline(Renewal $renewal, Request $request, RenewalLifecycleService $service)
    {
        Gate::authorize('update', $renewal);
        return new RenewalResource($service->decline($renewal, $request->user()->id));
    }

    public function cancel(Renewal $renewal, Request $request, RenewalLifecycleService $service)
    {
        Gate::authorize('update', $renewal);
        return new RenewalResource($service->cancel($renewal, $request->user()->id));
    }
}

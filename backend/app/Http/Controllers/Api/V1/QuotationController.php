<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuotationRequest;
use App\Http\Requests\UpdateQuotationRequest;
use App\Http\Resources\QuotationResource;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Quotation;
use App\Services\CreateQuotationService;
use App\Services\QuotationLifecycleService;
use App\Services\UpdateQuotationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    use AuthorizesRequests;

    private function eagerLoads(): array
    {
        return ['company', 'contact', 'opportunity', 'request', 'creator', 'items'];
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Quotation::class);

        $query = Quotation::with($this->eagerLoads());

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('company', fn($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        // Filters
        $directFilters = ['status', 'company_id', 'contact_id', 'opportunity_id', 'request_id', 'created_by', 'currency'];
        foreach ($directFilters as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        // Date filters
        if ($request->filled('issue_from')) {
            $query->whereDate('issue_date', '>=', $request->input('issue_from'));
        }
        if ($request->filled('issue_to')) {
            $query->whereDate('issue_date', '<=', $request->input('issue_to'));
        }
        if ($request->filled('valid_from')) {
            $query->whereDate('valid_until', '>=', $request->input('valid_from'));
        }
        if ($request->filled('valid_to')) {
            $query->whereDate('valid_until', '<=', $request->input('valid_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        // Sorting
        $sortWhitelist = ['reference', 'status', 'issue_date', 'valid_until', 'total_amount', 'created_at', 'updated_at'];
        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc'));

        if (in_array($sortBy, $sortWhitelist, true) && in_array($sortDir, ['asc', 'desc'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return QuotationResource::collection($query->paginate($perPage));
    }

    public function store(StoreQuotationRequest $request, CreateQuotationService $service)
    {
        $this->authorize('create', Quotation::class);

        $quotation = $service->execute($request->validated(), $request->user()->id);
        $quotation->load($this->eagerLoads());

        return response()->json([
            'message' => 'Quotation created',
            'data'    => new QuotationResource($quotation),
        ], 201);
    }

    public function show(Quotation $quotation)
    {
        $this->authorize('view', $quotation);

        $quotation->load($this->eagerLoads());

        return new QuotationResource($quotation);
    }

    public function update(UpdateQuotationRequest $request, Quotation $quotation, UpdateQuotationService $service)
    {
        $this->authorize('update', $quotation);

        $quotation = $service->execute($quotation, $request->validated(), $request->user()->id);
        $quotation->load($this->eagerLoads());

        return response()->json([
            'message' => 'Quotation updated',
            'data'    => new QuotationResource($quotation),
        ]);
    }

    public function destroy(Quotation $quotation)
    {
        $this->authorize('delete', $quotation);

        // Commercial history protection: only draft/cancelled may be deleted
        if (!in_array($quotation->status->value, ['draft', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Only draft or cancelled quotations can be deleted.',
            ], 422);
        }

        $hasPendingApproval = $quotation->approvals()->where('status', 'pending')->exists();
        if ($hasPendingApproval) {
            return response()->json([
                'message' => 'Cannot delete quotation while it has a pending approval request.',
            ], 422);
        }

        $oldValues = array_intersect_key($quotation->toArray(), array_flip([
            'id', 'reference', 'company_id', 'status', 'total_amount', 'currency', 'created_by',
        ]));

        $quotation->delete();

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action'          => 'quotation.deleted',
            'subject_type'    => Quotation::class,
            'subject_id'      => $quotation->id,
            'old_values'      => $oldValues,
            'new_values'      => null,
            'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
        ]);

        CrmActivity::create([
            'actor_id'     => auth()->id(),
            'type'         => 'quotation.deleted',
            'subject_type' => Quotation::class,
            'subject_id'   => $quotation->id,
            'company_id'   => $quotation->company_id,
            'metadata'     => [
                'quotation_id'        => $quotation->id,
                'quotation_reference' => $quotation->reference,
            ],
        ]);

        return response()->json(['message' => 'Quotation deleted']);
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    public function send(Quotation $quotation, QuotationLifecycleService $service)
    {
        $this->authorize('update', $quotation);
        $quotation = $service->transition($quotation, 'sent', auth()->id());
        $quotation->load($this->eagerLoads());

        return response()->json(['message' => 'Quotation sent', 'data' => new QuotationResource($quotation)]);
    }

    public function accept(Quotation $quotation, QuotationLifecycleService $service)
    {
        $this->authorize('update', $quotation);
        $quotation = $service->transition($quotation, 'accepted', auth()->id());
        $quotation->load($this->eagerLoads());

        return response()->json(['message' => 'Quotation accepted', 'data' => new QuotationResource($quotation)]);
    }

    public function reject(Quotation $quotation, QuotationLifecycleService $service)
    {
        $this->authorize('update', $quotation);
        $quotation = $service->transition($quotation, 'rejected', auth()->id());
        $quotation->load($this->eagerLoads());

        return response()->json(['message' => 'Quotation rejected', 'data' => new QuotationResource($quotation)]);
    }

    public function cancel(Quotation $quotation, QuotationLifecycleService $service)
    {
        $this->authorize('update', $quotation);
        $quotation = $service->transition($quotation, 'cancelled', auth()->id());
        $quotation->load($this->eagerLoads());

        return response()->json(['message' => 'Quotation cancelled', 'data' => new QuotationResource($quotation)]);
    }

    public function expire(Quotation $quotation, QuotationLifecycleService $service)
    {
        $this->authorize('update', $quotation);
        $quotation = $service->transition($quotation, 'expired', auth()->id());
        $quotation->load($this->eagerLoads());

        return response()->json(['message' => 'Quotation expired', 'data' => new QuotationResource($quotation)]);
    }
}

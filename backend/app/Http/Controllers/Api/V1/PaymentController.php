<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReversePaymentRequest;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentAllocationResource;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\CompanyCreditService;
use App\Services\CreatePaymentService;
use App\Services\ReversePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Payment::class);

        $query = Payment::query()->with(['invoice', 'company', 'customerUser', 'recorder', 'reverser']);

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search) {
                $builder->where('reference', 'like', '%' . $search . '%')
                    ->orWhere('transaction_reference', 'like', '%' . $search . '%')
                    ->orWhereHas('invoice', fn ($invoiceQuery) => $invoiceQuery->where('reference', 'like', '%' . $search . '%'))
                    ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        foreach (['status', 'company_id', 'customer_user_id', 'invoice_id', 'method', 'currency', 'recorded_by'] as $filter) {
            if ($request->filled($filter)) {
                $query->where(
                    $filter,
                    $filter === 'currency'
                        ? strtoupper($request->string($filter)->toString())
                        : $request->input($filter)
                );
            }
        }

        if ($request->filled('paid_from')) {
            $query->whereDate('paid_at', '>=', $request->input('paid_from'));
        }
        if ($request->filled('paid_to')) {
            $query->whereDate('paid_at', '<=', $request->input('paid_to'));
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        $sortable = ['created_at', 'reference', 'paid_at', 'amount', 'status'];
        $sortBy = in_array($request->input('sort_by'), $sortable, true) ? $request->input('sort_by') : 'created_at';
        $sortOrder = $request->input('sort_order') === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortOrder);

        return PaymentResource::collection($query->paginate((int) $request->input('per_page', 15)));
    }

    public function store(StorePaymentRequest $request, CreatePaymentService $service)
    {
        Gate::authorize('create', Payment::class);

        $payment = $service->execute($request->validated(), $request->user()->id);

        return (new PaymentResource($payment))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Payment $payment)
    {
        Gate::authorize('view', $payment);

        return new PaymentResource($payment->load(['invoice', 'company', 'customerUser', 'recorder', 'reverser']));
    }

    public function reverse(ReversePaymentRequest $request, Payment $payment, ReversePaymentService $service)
    {
        Gate::authorize('reverse', $payment);

        return new PaymentResource(
            $service->execute($payment->load(['invoice', 'customerUser']), $request->validated()['reversal_reason'], $request->user()->id)
        );
    }

    public function allocations(Payment $payment)
    {
        Gate::authorize('view', $payment);

        return \App\Http\Resources\PaymentAllocationResource::collection(
            $payment->allocations()->with('invoice')->get()
        );
    }

    public function outstandingInvoices(Request $request, \App\Services\PaymentAllocationService $service)
    {
        Gate::authorize('viewAny', Payment::class);

        $validated = $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        return response()->json([
            'data' => $service->getOutstandingInvoices(
                (int) $validated['company_id'],
                $validated['currency'] ?? null
            ),
        ]);
    }

    public function availableCredits(Request $request, CompanyCreditService $service)
    {
        Gate::authorize('viewAny', Payment::class);

        $validated = $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $companyId = (int) $validated['company_id'];
        $currency = $validated['currency'] ?? null;

        return response()->json([
            'data' => $service->getAvailableCredits($companyId, $currency),
            'summary' => $service->getAvailableCreditSummary($companyId),
        ]);
    }

    public function applyCredit(Request $request, Payment $payment, CompanyCreditService $service)
    {
        Gate::authorize('create', Payment::class);

        $validated = $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:255'],
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'allocations.*.amount' => ['required'],
            'allocations.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $service->applyCredit($payment, $validated, $request->user()->id);

        $allocationIds = collect($result['allocations'])->pluck('id')->all();
        $allocations = PaymentAllocation::query()
            ->whereIn('id', $allocationIds)
            ->with(['invoice', 'applier'])
            ->get();

        return response()->json([
            'message' => 'Company credit applied successfully.',
            'data' => [
                'payment' => new PaymentResource($result['payment']),
                'allocations' => PaymentAllocationResource::collection($allocations),
            ],
        ], 201);
    }

    public function reverseAllocation(Request $request, PaymentAllocation $allocation, CompanyCreditService $service)
    {
        Gate::authorize('reverse', $allocation->payment);

        $validated = $request->validate([
            'reversal_reason' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $reversed = $service->reverseCreditAllocation(
            $allocation,
            $validated['reversal_reason'],
            $request->user()->id
        );

        return response()->json([
            'message' => 'Credit allocation reversed successfully.',
            'data' => new PaymentAllocationResource($reversed),
        ]);
    }
}

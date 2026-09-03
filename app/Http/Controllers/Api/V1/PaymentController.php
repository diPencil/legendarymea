<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReversePaymentRequest;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
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
}

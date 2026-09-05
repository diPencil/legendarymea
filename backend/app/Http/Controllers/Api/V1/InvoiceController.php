<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\CreateInvoiceService;
use App\Services\InvoiceLifecycleService;
use App\Services\UpdateInvoiceService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Invoice::class);

        $query = Invoice::with(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('company', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('customerUser', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                  ->orWhereHas('contract', fn ($q) => $q->where('reference', 'like', "%{$search}%"))
                  ->orWhereHas('activeService', fn ($q) => $q->where('reference', 'like', "%{$search}%")
                      ->orWhere('title', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status'))           $query->where('status', $request->status);
        if ($request->filled('customer_type'))    $query->where('customer_type', $request->customer_type);
        if ($request->filled('company_id'))        $query->where('company_id', $request->company_id);
        if ($request->filled('customer_user_id'))  $query->where('customer_user_id', $request->customer_user_id);
        if ($request->filled('contract_id'))       $query->where('contract_id', $request->contract_id);
        if ($request->filled('active_service_id')) $query->where('active_service_id', $request->active_service_id);
        if ($request->filled('sold_by_employee_id')) $query->where('sold_by_employee_id', $request->sold_by_employee_id);
        if ($request->filled('created_by'))        $query->where('created_by', $request->created_by);
        if ($request->filled('currency'))          $query->where('currency', strtoupper($request->currency));
        if ($request->filled('issue_from'))        $query->whereDate('issue_date', '>=', $request->issue_from);
        if ($request->filled('issue_to'))          $query->whereDate('issue_date', '<=', $request->issue_to);
        if ($request->filled('due_from'))          $query->whereDate('due_date', '>=', $request->due_from);
        if ($request->filled('due_to'))            $query->whereDate('due_date', '<=', $request->due_to);
        if ($request->filled('created_from'))      $query->whereDate('created_at', '>=', $request->created_from);
        if ($request->filled('created_to'))        $query->whereDate('created_at', '<=', $request->created_to);

        $sortable = ['created_at', 'updated_at', 'reference', 'status', 'issue_date', 'due_date', 'subtotal', 'total_amount'];
        $sort = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $direction = $request->sort_order === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return InvoiceResource::collection($query->paginate((int) $request->input('per_page', 15)));
    }

    public function store(StoreInvoiceRequest $request, CreateInvoiceService $service)
    {
        Gate::authorize('create', Invoice::class);
        $invoice = $service->execute($request->validated(), $request->user()->id);
        return new InvoiceResource($invoice);
    }

    public function show(Invoice $invoice)
    {
        Gate::authorize('view', $invoice);

        \App\Services\SystemActivityService::recordView(auth()->user(), 'Invoice', $invoice);

        return new InvoiceResource($invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']));
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice, UpdateInvoiceService $service)
    {
        Gate::authorize('update', $invoice);
        $invoice = $service->execute($invoice, $request->validated(), $request->user()->id);
        return new InvoiceResource($invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']));
    }

    public function destroy(Invoice $invoice): Response
    {
        Gate::authorize('delete', $invoice);

        if (in_array($invoice->status, [
            InvoiceStatus::ISSUED,
            InvoiceStatus::PARTIALLY_PAID,
            InvoiceStatus::PAID,
            InvoiceStatus::OVERDUE,
        ])) {
            abort(422, 'Cannot delete an issued, paid, or overdue invoice.');
        }

        $invoice->delete();

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Invoice',
            entity: $invoice,
            oldValues: ['reference' => $invoice->reference],
            newValues: [],
            metadata: []
        );

        return response()->noContent();
    }

    public function issue(Invoice $invoice, Request $request, InvoiceLifecycleService $service)
    {
        Gate::authorize('issue', $invoice);
        $invoice = $service->issue($invoice, $request->user()->id);
        return new InvoiceResource($invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']));
    }

    public function cancel(Invoice $invoice, Request $request, InvoiceLifecycleService $service)
    {
        Gate::authorize('cancel', $invoice);
        $invoice = $service->cancel($invoice, $request->user()->id);
        return new InvoiceResource($invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']));
    }

    public function markOverdue(Invoice $invoice, Request $request, InvoiceLifecycleService $service)
    {
        Gate::authorize('update', $invoice);
        $invoice = $service->markOverdue($invoice, $request->user()->id);
        return new InvoiceResource($invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog', 'payments.recorder', 'payments.reverser']));
    }
}

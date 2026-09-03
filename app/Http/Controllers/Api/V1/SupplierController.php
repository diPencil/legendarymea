<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierBalanceFundingRequest;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Http\Resources\SupplierLedgerResource;
use App\Http\Resources\SupplierResource;
use App\Models\AuditLog;
use App\Models\Supplier;
use App\Services\CreateSupplierService;
use App\Services\SupplierLedgerService;
use App\Services\UpdateSupplierService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Supplier::class);

        $query = Supplier::with(['linkedUser', 'linkedCompany', 'balanceAccounts.ledgerEntries']);

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search) {
                $builder->where('reference', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        foreach (['type', 'status'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        $query->orderBy('created_at', 'desc');

        return SupplierResource::collection($query->paginate((int) $request->input('per_page', 15)));
    }

    public function store(StoreSupplierRequest $request, CreateSupplierService $service)
    {
        Gate::authorize('create', Supplier::class);

        return new SupplierResource($service->execute($request->validated(), $request->user()->id));
    }

    public function show(Supplier $supplier)
    {
        Gate::authorize('view', $supplier);

        return new SupplierResource($supplier->load([
            'linkedUser',
            'linkedCompany',
            'balanceAccounts.ledgerEntries.invoice',
            'ledgerEntries.invoice',
        ]));
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier, UpdateSupplierService $service)
    {
        Gate::authorize('update', $supplier);

        return new SupplierResource($service->execute($supplier, $request->validated(), $request->user()->id));
    }

    public function destroy(Supplier $supplier)
    {
        Gate::authorize('delete', $supplier);

        if ($supplier->ledgerEntries()->exists() || $supplier->invoiceItems()->exists()) {
            return response()->json(['message' => 'Suppliers with financial history cannot be deleted.'], 422);
        }

        $supplier->delete();

        AuditLog::create([
            'user_id' => request()->user()->id,
            'action' => 'supplier.deleted',
            'subject_type' => Supplier::class,
            'subject_id' => $supplier->id,
            'old_values' => ['reference' => $supplier->reference],
        ]);

        return response()->noContent();
    }

    public function fund(StoreSupplierBalanceFundingRequest $request, Supplier $supplier, SupplierLedgerService $service)
    {
        Gate::authorize('fund', $supplier);

        $entry = $service->fundBalance($supplier, $request->validated(), $request->user()->id);

        return (new SupplierLedgerResource($entry))
            ->additional(['message' => __('Supplier balance funded successfully.')]);
    }
}

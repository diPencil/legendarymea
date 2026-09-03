<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContractStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\UpdateContractRequest;
use App\Http\Resources\ContractResource;
use App\Models\AuditLog;
use App\Models\Contract;
use App\Services\ContractLifecycleService;
use App\Services\CreateContractService;
use App\Services\ContractPdfGenerator;
use App\Services\UpdateContractService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContractController extends Controller
{
    use \Illuminate\Foundation\Auth\Access\AuthorizesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Contract::class);

        $query = Contract::with(['company', 'contact', 'quotation', 'creator']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhereHas('company', fn($c) => $c->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('quotation', fn($qt) => $qt->where('reference', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->query('company_id'));
        }

        if ($request->filled('contact_id')) {
            $query->where('contact_id', $request->query('contact_id'));
        }

        if ($request->filled('quotation_id')) {
            $query->where('quotation_id', $request->query('quotation_id'));
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->query('created_by'));
        }

        if ($request->filled('currency')) {
            $query->where('currency', strtoupper($request->query('currency')));
        }

        if ($startFrom = $request->query('start_from')) {
            $query->whereDate('start_date', '>=', $startFrom);
        }

        if ($startTo = $request->query('start_to')) {
            $query->whereDate('start_date', '<=', $startTo);
        }

        if ($endFrom = $request->query('end_from')) {
            $query->whereDate('end_date', '>=', $endFrom);
        }

        if ($endTo = $request->query('end_to')) {
            $query->whereDate('end_date', '<=', $endTo);
        }

        if ($createdFrom = $request->query('created_from')) {
            $query->whereDate('created_at', '>=', $createdFrom);
        }

        if ($createdTo = $request->query('created_to')) {
            $query->whereDate('created_at', '<=', $createdTo);
        }

        $sortField = $request->query('sort_by', 'created_at');
        $sortOrder = $request->query('sort_order', 'desc');

        $allowedSorts = ['created_at', 'updated_at', 'reference', 'title', 'status', 'start_date', 'end_date', 'contract_value'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->query('per_page', 15), 100);

        return ContractResource::collection($query->paginate($perPage));
    }

    public function store(StoreContractRequest $request, CreateContractService $service): ContractResource
    {
        $this->authorize('create', Contract::class);

        $contract = $service->execute($request->validated(), $request->user()->id);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function show(Contract $contract): ContractResource
    {
        $this->authorize('view', $contract);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function downloadPdf(Contract $contract, ContractPdfGenerator $generator): \Illuminate\Http\Response
    {
        $this->authorize('view', $contract);

        $pdf = $generator->generate($contract->load(['company', 'contact', 'quotation', 'creator']));

        AuditLog::create([
            'user_id'         => request()->user()->id,
            'action'          => 'contract.pdf_downloaded',
            'subject_type'    => Contract::class,
            'subject_id'      => $contract->id,
            'old_values'      => null,
            'new_values'      => ['filename' => $pdf->filename],
            'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
        ]);

        return response($pdf->contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . addslashes($pdf->filename) . '"',
            'Content-Length' => (string) strlen($pdf->contents),
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function update(UpdateContractRequest $request, Contract $contract, UpdateContractService $service, ContractLifecycleService $lifecycleService): ContractResource
    {
        $this->authorize('update', $contract);

        $contract = $service->execute($contract, $request->validated(), $request->user()->id, $lifecycleService);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function destroy(Contract $contract): \Illuminate\Http\Response
    {
        $this->authorize('delete', $contract);

        if (!in_array($contract->status, [ContractStatus::DRAFT, ContractStatus::CANCELLED])) {
            abort(403, 'Only draft or cancelled contracts can be deleted.');
        }

        $contract->delete();

        AuditLog::create([
            'user_id'         => request()->user()->id,
            'action'          => 'contract.deleted',
            'subject_type'    => Contract::class,
            'subject_id'      => $contract->id,
            'old_values'      => ['reference' => $contract->reference],
            'new_values'      => null,
            'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
        ]);

        return response()->noContent();
    }

    public function activate(Contract $contract, ContractLifecycleService $service): ContractResource
    {
        $this->authorize('update', $contract);

        $contract = $service->activate($contract, request()->user()->id);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function expire(Contract $contract, ContractLifecycleService $service): ContractResource
    {
        $this->authorize('update', $contract);

        $contract = $service->expire($contract, request()->user()->id);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function terminate(Contract $contract, ContractLifecycleService $service): ContractResource
    {
        $this->authorize('update', $contract);

        $contract = $service->terminate($contract, request()->user()->id);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function cancel(Contract $contract, ContractLifecycleService $service): ContractResource
    {
        $this->authorize('update', $contract);

        $contract = $service->cancel($contract, request()->user()->id);

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }
}

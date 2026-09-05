<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;
use App\Http\Resources\CompanyResource;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Requests\AssignCompanyAccountManagerRequest;
use App\Services\CreateCompanyService;
use App\Services\UpdateCompanyService;
use App\Services\AssignCompanyAccountManager;
use Illuminate\Support\Facades\Gate;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Company::class);

        $query = Company::with(['companyRelationships', 'accountManager.user']);

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('legal_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('website', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('country_code')) {
            $query->where('country_code', $request->input('country_code'));
        }

        if ($request->filled('account_manager_id')) {
            $query->where('account_manager_id', $request->input('account_manager_id'));
        }

        if ($request->filled('relationship')) {
            $query->whereHas('companyRelationships', function ($q) use ($request) {
                $q->where('type', $request->input('relationship'));
            });
        }

        // Sorting whitelist
        $allowedSorts = ['reference', 'name', 'status', 'created_at', 'updated_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return CompanyResource::collection($query->paginate($perPage));
    }

    public function store(StoreCompanyRequest $request, CreateCompanyService $service)
    {
        Gate::authorize('create', Company::class);

        $company = $service->execute($request->validated());

        return (new CompanyResource($company->load(['companyRelationships', 'accountManager.user'])))
            ->additional(['message' => __('Company created successfully.')])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Company $company)
    {
        Gate::authorize('view', $company);


        \App\Services\SystemActivityService::recordView(auth()->user(), 'Company', $company);

        return new CompanyResource($this->loadCompanyDetail($company));
    }

    public function update(UpdateCompanyRequest $request, Company $company, UpdateCompanyService $service)
    {
        Gate::authorize('update', $company);

        $company = $service->execute($company, $request->validated());

        return (new CompanyResource($this->loadCompanyDetail($company)))
            ->additional(['message' => __('Company updated successfully.')]);
    }

    public function destroy(Company $company)
    {
        Gate::authorize('delete', $company);

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Company',
            entity: $company,
            oldValues: $company->toArray(),
            newValues: [],
            metadata: []
        );

        $company->delete();

        return response()->json([
            'message' => __('Company deleted successfully.')
        ]);
    }

    public function accountManager(AssignCompanyAccountManagerRequest $request, Company $company, AssignCompanyAccountManager $service)
    {
        Gate::authorize('update', $company);

        $company = $service->execute($company, $request->validated('account_manager_id'));

        return (new CompanyResource($this->loadCompanyDetail($company)))
            ->additional(['message' => __('Account manager assigned successfully.')]);
    }

    private function loadCompanyDetail(Company $company): Company
    {
        return $company
            ->load(['companyRelationships', 'accountManager.user', 'primaryContact'])
            ->loadCount('contacts');
    }
}

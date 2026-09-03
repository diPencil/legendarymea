<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;
use App\Models\Contact;
use App\Http\Resources\ContactResource;
use App\Http\Requests\SetPrimaryContactRequest;
use App\Services\SetPrimaryCompanyContactService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CompanyContactController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request, Company $company)
    {
        $this->authorize('view', $company);
        $this->authorize('viewAny', Contact::class); // Ensure they can view contacts in general

        $query = $company->contacts();

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('job_title', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%");
            });
        }

        // Filtering
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->has('country_code')) {
            $query->where('country_code', $request->input('country_code'));
        }
        if ($request->has('is_primary')) {
            $query->where('is_primary', filter_var($request->input('is_primary'), FILTER_VALIDATE_BOOLEAN));
        }

        // Sorting
        $allowedSorts = ['reference', 'first_name', 'last_name', 'status', 'created_at', 'updated_at'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $contacts = $query->paginate($perPage);

        return ContactResource::collection($contacts);
    }

    public function setPrimary(SetPrimaryContactRequest $request, Company $company, SetPrimaryCompanyContactService $service)
    {
        $contact = Contact::findOrFail($request->input('contact_id'));
        
        $this->authorize('update', $company);
        $this->authorize('update', $contact);

        try {
            $updatedContact = $service->execute($company, $contact);
            return new ContactResource($updatedContact->load('company'));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}

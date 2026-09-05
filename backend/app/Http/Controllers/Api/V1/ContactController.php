<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Contact;
use App\Http\Requests\StoreContactRequest;
use App\Http\Requests\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Services\CreateContactService;
use App\Services\UpdateContactService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ContactController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CreateContactService $createService,
        private UpdateContactService $updateService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Contact::class);

        $query = Contact::query();

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
        if ($request->has('company_id')) {
            $query->where('company_id', $request->input('company_id'));
        }
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
        $contacts = $query->with('company')->paginate($perPage);

        return ContactResource::collection($contacts);
    }

    public function store(StoreContactRequest $request)
    {
        $this->authorize('create', Contact::class);
        $contact = $this->createService->execute($request->validated());
        return (new ContactResource($contact->load('company')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Contact $contact)
    {
        $this->authorize('view', $contact);
        return new ContactResource($contact->load('company'));
    }

    public function update(UpdateContactRequest $request, Contact $contact)
    {
        $this->authorize('update', $contact);
        $updatedContact = $this->updateService->execute($contact, $request->validated());
        return new ContactResource($updatedContact->load('company'));
    }

    public function destroy(Contact $contact)
    {
        $this->authorize('delete', $contact);

        \Illuminate\Support\Facades\DB::transaction(function () use ($contact) {
            // Unset primary status safely if it was primary
            if ($contact->is_primary) {
                $contact->is_primary = false;
                $contact->save();
            }

            // Log Audit
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Contact',
            entity: $contact,
            oldValues: [],
            newValues: [],
            metadata: [
                            'contact_reference' => $contact->reference,
                        ]
        );

            $contact->delete();
        });

        return response()->json(['message' => __('Contact deleted successfully.')]);
    }
}

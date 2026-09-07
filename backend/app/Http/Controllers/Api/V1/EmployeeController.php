<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use Illuminate\Support\Facades\Gate;
use App\Http\Resources\EmployeeResource;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeDocumentResource;
use App\Models\EmployeeDocument;
use App\Services\EmployeeAccountAccessService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Employee::class);

        $query = Employee::with(['user', 'manager.user']);

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('job_title', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('department')) {
            $query->where('department', $request->input('department'));
        }
        if ($request->filled('manager_id')) {
            $query->where('manager_id', $request->input('manager_id'));
        }

        // Sorting
        $allowedSorts = ['employee_code', 'created_at', 'hire_date', 'status'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        
        $employees = $query->paginate($perPage);

        return EmployeeResource::collection($employees);
    }

    public function managers(Request $request)
    {
        abort_unless(
            \App\Support\PermissionAccess::can($request->user(), 'view_employees', 'create_employees', 'update_employees', 'manage_employees'),
            403
        );

        $managers = Employee::query()
            ->with(['user', 'manager.user'])
            ->where('status', 'active')
            ->whereHas('user.roles', function ($query) {
                $query->whereRaw('LOWER(name) = ?', ['manager']);
            })
            ->orderBy('employee_code')
            ->limit(100)
            ->get();

        return EmployeeResource::collection($managers);
    }

    public function store(StoreEmployeeRequest $request, \App\Services\CreateEmployeeService $service)
    {
        Gate::authorize('create', Employee::class);

        $employee = $service->execute($request->validated());

        return (new EmployeeResource($employee->load(['user', 'manager.user'])))
            ->additional(['message' => __('Employee created successfully.')]);
    }

    public function show(Employee $employee)
    {
        Gate::authorize('view', $employee);

        return new EmployeeResource($employee->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader']));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee, \App\Services\UpdateEmployeeService $service)
    {
        Gate::authorize('update', $employee);

        $employee = $service->execute($employee, $request->validated());

        return (new EmployeeResource($employee->load(['user', 'manager.user'])))
            ->additional(['message' => __('Employee updated successfully.')]);
    }

    public function destroy(Employee $employee)
    {
        Gate::authorize('delete', $employee);

        \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Employee',
            entity: $employee,
            oldValues: $employee->toArray(),
            newValues: [],
            metadata: []
        );

        $employee->delete();
        return response()->json([
            'message' => __('Employee deleted successfully.')
        ]);
    }

    public function resendAccountInvite(Employee $employee, EmployeeAccountAccessService $service)
    {
        Gate::authorize('update', $employee);

        $service->resendInvite($employee->load('user'), auth()->user());

        return (new EmployeeResource($employee->fresh()->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader'])))
            ->additional(['message' => __('Employee account invite resent successfully.')]);
    }

    public function resetTemporaryPassword(Employee $employee, EmployeeAccountAccessService $service)
    {
        Gate::authorize('update', $employee);

        $service->resetTemporaryPassword($employee->load('user'), auth()->user());

        return (new EmployeeResource($employee->fresh()->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader'])))
            ->additional(['message' => __('Temporary password reset and invite sent successfully.')]);
    }

    public function disableAccount(Employee $employee, EmployeeAccountAccessService $service)
    {
        Gate::authorize('update', $employee);

        $service->disable($employee->load('user'), auth()->user());

        return (new EmployeeResource($employee->fresh()->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader'])))
            ->additional(['message' => __('Employee account disabled successfully.')]);
    }

    public function enableAccount(Employee $employee, EmployeeAccountAccessService $service)
    {
        Gate::authorize('update', $employee);

        $service->enable($employee->load('user'), auth()->user());

        return (new EmployeeResource($employee->fresh()->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader'])))
            ->additional(['message' => __('Employee account enabled successfully.')]);
    }

    public function uploadIdentityDocument(Request $request, Employee $employee)
    {
        Gate::authorize('update', $employee);

        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        $oldPath = $employee->identity_document_path;
        $path = $this->storePrivateEmployeeFile($employee, $request->file('file'), 'identity');

        $employee->forceFill([
            'identity_document_path' => $path,
            'identity_document_original_name' => $request->file('file')->getClientOriginalName(),
            'identity_document_mime_type' => $request->file('file')->getMimeType() ?? $request->file('file')->getClientMimeType(),
            'identity_document_size' => $request->file('file')->getSize(),
            'identity_document_uploaded_by' => auth()->id(),
            'identity_document_uploaded_at' => now(),
        ])->save();

        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'uploaded',
            module: 'Employee Identity Document',
            entity: $employee,
            oldValues: [],
            newValues: ['identity_document_original_name' => $employee->identity_document_original_name],
            metadata: []
        );

        return (new EmployeeResource($employee->load(['user', 'manager.user', 'identityDocumentUploader', 'documents.uploader'])))
            ->additional(['message' => __('Identity document uploaded successfully.')]);
    }

    public function viewIdentityDocument(Employee $employee)
    {
        Gate::authorize('view', $employee);

        if (!$employee->identity_document_path || !Storage::disk('local')->exists($employee->identity_document_path)) {
            return response()->json(['message' => __('File not found on server.')], 404);
        }

        return Storage::disk('local')->response($employee->identity_document_path, $employee->identity_document_original_name, [
            'Content-Type' => $employee->identity_document_mime_type,
        ]);
    }

    public function downloadIdentityDocument(Employee $employee)
    {
        Gate::authorize('view', $employee);

        if (!$employee->identity_document_path || !Storage::disk('local')->exists($employee->identity_document_path)) {
            return response()->json(['message' => __('File not found on server.')], 404);
        }

        return Storage::disk('local')->download($employee->identity_document_path, $employee->identity_document_original_name);
    }

    public function storeDocument(Request $request, Employee $employee)
    {
        Gate::authorize('update', $employee);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'document_type' => ['nullable', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        $file = $request->file('file');
        $document = EmployeeDocument::create([
            'employee_id' => $employee->id,
            'title' => $validated['title'],
            'document_type' => $validated['document_type'] ?? null,
            'path' => $this->storePrivateEmployeeFile($employee, $file, 'documents'),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => auth()->id(),
        ]);

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'uploaded',
            module: 'Employee Document',
            entity: $employee,
            oldValues: [],
            newValues: ['title' => $document->title, 'original_name' => $document->original_name],
            metadata: []
        );

        return new EmployeeDocumentResource($document->load('uploader'));
    }

    public function replaceDocument(Request $request, Employee $employee, EmployeeDocument $document)
    {
        Gate::authorize('update', $employee);
        $this->ensureEmployeeDocument($employee, $document);

        $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'document_type' => ['nullable', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        $oldPath = $document->path;
        $file = $request->file('file');
        $document->update([
            'title' => $request->input('title', $document->title),
            'document_type' => $request->input('document_type', $document->document_type),
            'path' => $this->storePrivateEmployeeFile($employee, $file, 'documents'),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => auth()->id(),
        ]);

        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        return new EmployeeDocumentResource($document->fresh()->load('uploader'));
    }

    public function viewDocument(Employee $employee, EmployeeDocument $document)
    {
        Gate::authorize('view', $employee);
        $this->ensureEmployeeDocument($employee, $document);

        if (!Storage::disk('local')->exists($document->path)) {
            return response()->json(['message' => __('File not found on server.')], 404);
        }

        return Storage::disk('local')->response($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
        ]);
    }

    public function downloadDocument(Employee $employee, EmployeeDocument $document)
    {
        Gate::authorize('view', $employee);
        $this->ensureEmployeeDocument($employee, $document);

        if (!Storage::disk('local')->exists($document->path)) {
            return response()->json(['message' => __('File not found on server.')], 404);
        }

        return Storage::disk('local')->download($document->path, $document->original_name);
    }

    public function destroyDocument(Employee $employee, EmployeeDocument $document)
    {
        Gate::authorize('update', $employee);
        $this->ensureEmployeeDocument($employee, $document);

        $path = $document->path;
        $document->delete();

        if ($path && Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }

        return response()->noContent();
    }

    private function storePrivateEmployeeFile(Employee $employee, UploadedFile $file, string $group): string
    {
        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension();
        $filename = Str::random(40) . '.' . $extension;

        return $file->storeAs("employee-documents/{$employee->id}/{$group}", $filename, 'local');
    }

    private function ensureEmployeeDocument(Employee $employee, EmployeeDocument $document): void
    {
        abort_unless((int) $document->employee_id === (int) $employee->id, 404);
    }
}

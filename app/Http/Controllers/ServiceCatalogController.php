<?php

namespace App\Http\Controllers;

use App\Models\ServiceCatalog;
use App\Support\PermissionAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceCatalogController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(
            $request->is('api/v1/public/*') || PermissionAccess::can($request->user(), 'view_service_catalog', 'view_settings', 'manage_settings'),
            403
        );

        $query = ServiceCatalog::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($serviceQuery) use ($search) {
                $serviceQuery->where('code', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category')->toString());
        }

        if ($request->filled('status')) {
            $query->where('active', $request->input('status') === 'active');
        }
        
        if ($request->has('show_in_contact')) {
            $query->where('show_in_contact', $request->boolean('show_in_contact'));
        }
        if ($request->has('available_for_invoice')) {
            $query->where('available_for_invoice', $request->boolean('available_for_invoice'));
        }
        if ($request->has('available_for_active_service')) {
            $query->where('available_for_active_service', $request->boolean('available_for_active_service'));
        }
        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }
        
        $query->orderBy('sort_order', 'asc')->orderBy('id', 'asc');
        
        // Paginate if requested, otherwise return all (e.g. for dropdowns)
        if ($request->has('per_page')) {
            return $query->paginate($request->integer('per_page'));
        }
        
        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        abort_unless(PermissionAccess::can($request->user(), 'create_service_catalog', 'manage_settings'), 403);

        $validated = $request->validate([
            'code' => 'required|string|unique:service_catalogs,code',
            'name_en' => 'required|string',
            'name_ar' => 'required|string',
            'category' => 'nullable|string',
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'active' => 'boolean',
            'show_in_contact' => 'boolean',
            'available_for_invoice' => 'boolean',
            'available_for_active_service' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);
        
        $service = ServiceCatalog::create($validated);
        return response()->json(['data' => $service], 201);
    }

    public function show(Request $request, ServiceCatalog $serviceCatalog)
    {
        abort_unless(PermissionAccess::can($request->user(), 'view_service_catalog', 'view_settings', 'manage_settings'), 403);

        return response()->json(['data' => $serviceCatalog]);
    }

    public function update(Request $request, ServiceCatalog $serviceCatalog)
    {
        abort_unless(PermissionAccess::can($request->user(), 'update_service_catalog', 'manage_settings'), 403);

        $validated = $request->validate([
            'code' => ['required', 'string', Rule::unique('service_catalogs', 'code')->ignore($serviceCatalog->id)],
            'name_en' => 'required|string',
            'name_ar' => 'required|string',
            'category' => 'nullable|string',
            'description_en' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'active' => 'boolean',
            'show_in_contact' => 'boolean',
            'available_for_invoice' => 'boolean',
            'available_for_active_service' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);
        
        $serviceCatalog->update($validated);
        return response()->json(['data' => $serviceCatalog]);
    }

    public function destroy(ServiceCatalog $serviceCatalog)
    {
        $serviceCatalog->delete();
        return response()->noContent();
    }
}

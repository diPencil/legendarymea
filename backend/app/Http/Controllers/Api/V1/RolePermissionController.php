<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LegendaryPermissions;
use App\Support\PermissionAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(PermissionAccess::can($request->user(), 'view_roles_permissions', 'manage_user_roles', 'manage_roles'), 403);

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->name === 'super_admin'
                    ? LegendaryPermissions::all()
                    : $role->permissions->pluck('name')->values(),
                'locked' => $role->name === 'super_admin',
            ])
            ->values();

        return response()->json([
            'data' => [
                'groups' => collect(LegendaryPermissions::visibleToMatrix())
                    ->map(fn (array $permissions, string $name) => [
                        'name' => $name,
                        'permissions' => $permissions,
                    ])
                    ->values(),
                'roles' => $roles,
            ],
        ]);
    }

    public function update(Request $request, Role $role)
    {
        abort_unless(PermissionAccess::can($request->user(), 'manage_roles_permissions', 'manage_user_roles', 'manage_roles'), 403);

        $allowed = LegendaryPermissions::all();
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in($allowed)],
        ]);

        $permissions = $role->name === 'super_admin'
            ? $allowed
            : $validated['permissions'];

        $role->syncPermissions(
            Permission::query()
                ->whereIn('name', $permissions)
                ->where('guard_name', LegendaryPermissions::GUARD)
                ->get()
        );

        return response()->json([
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->name === 'super_admin'
                    ? $allowed
                    : $role->fresh('permissions')->permissions->pluck('name')->values(),
                'locked' => $role->name === 'super_admin',
            ],
        ]);
    }
}

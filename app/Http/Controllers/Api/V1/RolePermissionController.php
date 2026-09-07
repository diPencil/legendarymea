<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LegendaryPermissions;
use App\Support\PermissionAccess;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    private const EXCLUDED_MATRIX_ROLES = ['client'];

    public function index(Request $request)
    {
        abort_unless(PermissionAccess::can($request->user(), 'view_roles_permissions', 'manage_user_roles', 'manage_roles'), 403);

        $this->ensureMatrixPermissionsExist();

        $allowed = collect(LegendaryPermissions::all());

        $roles = Role::query()
            ->with('permissions:id,name')
            ->whereRaw('LOWER(name) NOT IN (' . collect(self::EXCLUDED_MATRIX_ROLES)->map(fn () => '?')->implode(',') . ')', self::EXCLUDED_MATRIX_ROLES)
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $this->roleName($role),
                'permissions' => $this->roleName($role) === 'super_admin'
                    ? LegendaryPermissions::all()
                    : $this->matrixPermissionsOnly($role->permissions->pluck('name'), $allowed),
                'locked' => $this->roleName($role) === 'super_admin',
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
        abort_if(in_array($this->roleName($role), self::EXCLUDED_MATRIX_ROLES, true), 404);

        $this->ensureMatrixPermissionsExist();

        $allowed = LegendaryPermissions::all();
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string'],
        ]);

        $permissions = $this->roleName($role) === 'super_admin'
            ? $allowed
            : collect($validated['permissions'])
                ->intersect($allowed)
                ->values()
                ->all();

        $role->syncPermissions(
            Permission::query()
                ->whereIn('name', $permissions)
                ->where('guard_name', LegendaryPermissions::GUARD)
                ->get()
        );

        return response()->json([
            'data' => [
                'id' => $role->id,
                'name' => $this->roleName($role),
                'permissions' => $this->roleName($role) === 'super_admin'
                    ? $allowed
                    : $this->matrixPermissionsOnly($role->fresh('permissions')->permissions->pluck('name'), collect($allowed)),
                'locked' => $this->roleName($role) === 'super_admin',
            ],
        ]);
    }

    private function roleName(Role $role): string
    {
        return strtolower($role->name) === 'super admin'
            ? 'super_admin'
            : strtolower($role->name);
    }

    private function matrixPermissionsOnly(Collection $permissions, Collection $allowed): array
    {
        return $permissions
            ->intersect($allowed)
            ->values()
            ->all();
    }

    private function ensureMatrixPermissionsExist(): void
    {
        foreach (LegendaryPermissions::all() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => LegendaryPermissions::GUARD,
            ]);
        }
    }
}

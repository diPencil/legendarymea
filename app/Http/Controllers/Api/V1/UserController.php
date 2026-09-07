<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\Employee;
use App\Models\User;
use App\Enums\UserStatus;
use App\Support\PermissionAccess;
use App\Services\ReferenceGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $query = User::query()->with('roles.permissions', 'permissions', 'employee');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'name', 'email', 'username'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return UserResource::collection($query->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Gate::authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:8',
            'roles' => 'sometimes|array',
            'roles.*' => 'string',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['status'] = UserStatus::ACTIVE->value;

        $user = User::create($validated);

        if ($request->has('roles')) {
            $roles = $this->normalizeRoleNames($request->input('roles', []));
            $this->authorizeRoleManagement($request->user(), $roles, null);
            $user->syncRoles($roles);
            $this->ensureEmployeeProfileForInternalRole($user, $roles);
        }

        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        Gate::authorize('view', $user);
        
        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        Gate::authorize('update', $user);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'username' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'roles' => 'sometimes|array',
            'roles.*' => 'string',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        if ($request->has('roles')) {
            $nextRoles = $this->normalizeRoleNames($request->input('roles', []));
            $this->authorizeRoleManagement($request->user(), $nextRoles, $user);
            $this->assertSuperAdminProtection($user, $nextRoles, 'role');
            $user->syncRoles($nextRoles);
            $this->ensureEmployeeProfileForInternalRole($user, $nextRoles);
        }

        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        Gate::authorize('delete', $user);
        $this->assertSuperAdminProtection($user, [], 'delete');
        $user->delete();
        return response()->noContent();
    }

    public function roles(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        if (!PermissionAccess::can($request->user(), 'view_roles_permissions', 'manage_roles_permissions', 'manage_user_roles', 'manage_users')) {
            abort(403);
        }

        return response()->json([
            'data' => Role::query()
                ->whereRaw('LOWER(name) <> ?', ['client'])
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function activate(User $user)
    {
        Gate::authorize('update', $user);

        $user->update(['status' => UserStatus::ACTIVE->value]);

        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    public function deactivate(Request $request, User $user)
    {
        Gate::authorize('update', $user);

        if ($request->user()->id === $user->id) {
            abort(403);
        }

        $this->assertSuperAdminProtection($user, null, 'deactivate');

        $user->update(['status' => UserStatus::INACTIVE->value]);

        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    public function resetPassword(Request $request, User $user)
    {
        Gate::authorize('update', $user);

        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return new UserResource($user->load('roles.permissions', 'permissions', 'employee'));
    }

    private function authorizeRoleManagement(User $actor, array $roles, ?User $target): void
    {
        if (!PermissionAccess::can($actor, 'manage_roles_permissions', 'manage_user_roles')) {
            abort(403, 'You are not authorized to manage user roles.');
        }

        if (!PermissionAccess::hasRole($actor, 'super_admin') && in_array('super_admin', $roles, true)) {
            abort(403, 'You are not authorized to assign Super Admin.');
        }

        if ($target && PermissionAccess::hasRole($target, 'super_admin') && !PermissionAccess::hasRole($actor, 'super_admin')) {
            abort(403, 'You are not authorized to change Super Admin roles.');
        }
    }

    private function assertSuperAdminProtection(User $target, ?array $nextRoles, string $action): void
    {
        if (!PermissionAccess::hasRole($target, 'super_admin')) {
            return;
        }

        $wouldRemainSuperAdmin = $nextRoles === null || in_array('super_admin', $nextRoles, true);
        if ($action === 'role' && $wouldRemainSuperAdmin) {
            return;
        }

        $activeSuperAdmins = User::query()
            ->where('status', UserStatus::ACTIVE->value)
            ->whereHas('roles', fn ($query) => $query->whereRaw('LOWER(name) = ?', ['super_admin']))
            ->count();

        if ($activeSuperAdmins <= 1) {
            abort(422, 'The last active Super Admin cannot be removed, deactivated, or deleted.');
        }
    }

    private function normalizeRoleNames(array $roles): array
    {
        $canonicalNames = [
            'super admin' => 'super_admin',
            'super_admin' => 'super_admin',
            'admin' => 'admin',
            'manager' => 'manager',
            'employee' => 'employee',
            'client' => 'client',
        ];

        return collect($roles)
            ->map(fn ($role) => strtolower(str_replace('_', ' ', (string) $role)))
            ->map(fn (string $role) => $canonicalNames[$role] ?? str_replace(' ', '_', $role))
            ->unique()
            ->values()
            ->each(function (string $role) {
                if (!Role::query()->whereRaw('LOWER(name) = ?', [strtolower($role)])->exists()) {
                    abort(422, "The selected role {$role} is invalid.");
                }
            })
            ->all();
    }

    private function ensureEmployeeProfileForInternalRole(User $user, array $roles): void
    {
        if (!collect($roles)->intersect(['manager', 'employee'])->isNotEmpty()) {
            return;
        }

        if ($user->employee()->exists()) {
            return;
        }

        $employeeCode = app(ReferenceGeneratorService::class)
            ->generate('LM-EMP-', 'employees', 'employee_code');

        $user->employee()->create([
            'name' => $user->name,
            'employee_code' => $employeeCode,
            'job_title' => in_array('manager', $roles, true) ? 'Manager' : null,
            'status' => 'active',
        ]);
    }
}

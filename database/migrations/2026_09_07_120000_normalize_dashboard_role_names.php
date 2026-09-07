<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $canonicalRoles = [
            'super admin' => 'super_admin',
            'super_admin' => 'super_admin',
            'admin' => 'admin',
            'manager' => 'manager',
            'employee' => 'employee',
            'client' => 'client',
        ];

        DB::transaction(function () use ($canonicalRoles) {
            foreach ($canonicalRoles as $lookup => $canonicalName) {
                $roles = DB::table('roles')
                    ->whereRaw("LOWER(REPLACE(name, '_', ' ')) = ?", [$lookup])
                    ->orderByRaw('CASE WHEN name = ? THEN 0 ELSE 1 END', [$canonicalName])
                    ->orderBy('id')
                    ->get();

                if ($roles->isEmpty()) {
                    continue;
                }

                $target = $roles->firstWhere('name', $canonicalName) ?? $roles->first();

                if ($target->name !== $canonicalName) {
                    DB::table('roles')
                        ->where('id', $target->id)
                        ->update([
                            'name' => $canonicalName,
                            'updated_at' => now(),
                        ]);
                }

                foreach ($roles->where('id', '!=', $target->id) as $duplicate) {
                    $modelRoles = DB::table('model_has_roles')
                        ->where('role_id', $duplicate->id)
                        ->get();

                    foreach ($modelRoles as $modelRole) {
                        DB::table('model_has_roles')->updateOrInsert([
                            'role_id' => $target->id,
                            'model_type' => $modelRole->model_type,
                            'model_id' => $modelRole->model_id,
                        ], []);
                    }

                    $rolePermissions = DB::table('role_has_permissions')
                        ->where('role_id', $duplicate->id)
                        ->get();

                    foreach ($rolePermissions as $rolePermission) {
                        DB::table('role_has_permissions')->updateOrInsert([
                            'permission_id' => $rolePermission->permission_id,
                            'role_id' => $target->id,
                        ], []);
                    }

                    DB::table('model_has_roles')->where('role_id', $duplicate->id)->delete();
                    DB::table('role_has_permissions')->where('role_id', $duplicate->id)->delete();
                    DB::table('roles')->where('id', $duplicate->id)->delete();
                }
            }
        });

        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Role normalization is intentionally not reversed because it preserves
        // existing user-role and role-permission relationships under canonical names.
    }
};

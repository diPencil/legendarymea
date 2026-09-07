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
        DB::transaction(function () {
            $users = DB::table('users')
                ->select('users.id', 'users.name', 'users.status')
                ->leftJoin('employees', 'employees.user_id', '=', 'users.id')
                ->whereNull('employees.id')
                ->whereExists(function ($query) {
                    $query->selectRaw('1')
                        ->from('model_has_roles')
                        ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                        ->whereColumn('model_has_roles.model_id', 'users.id')
                        ->where('model_has_roles.model_type', 'App\\Models\\User')
                        ->whereIn(DB::raw('LOWER(roles.name)'), ['manager', 'employee']);
                })
                ->get();

            foreach ($users as $user) {
                $isManager = DB::table('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->where('model_has_roles.model_id', $user->id)
                    ->where('model_has_roles.model_type', 'App\\Models\\User')
                    ->whereRaw('LOWER(roles.name) = ?', ['manager'])
                    ->exists();

                DB::table('employees')->insert([
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'employee_code' => $this->uniqueEmployeeCode((int) $user->id),
                    'job_title' => $isManager ? 'Manager' : null,
                    'status' => $user->status === 'active' ? 'active' : 'inactive',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Backfilled employee profiles may become real business records after
        // creation, so this migration intentionally does not delete them.
    }

    private function uniqueEmployeeCode(int $userId): string
    {
        $base = 'LM-EMP-U' . str_pad((string) $userId, 6, '0', STR_PAD_LEFT);
        $candidate = $base;
        $suffix = 1;

        while (DB::table('employees')->where('employee_code', $candidate)->exists()) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }
};

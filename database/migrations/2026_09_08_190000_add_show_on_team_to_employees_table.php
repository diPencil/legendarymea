<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('show_on_team')->default(false)->after('is_sales_eligible');
        });

        DB::table('employees')
            ->where('employees.status', 'active')
            ->whereNull('employees.deleted_at')
            ->whereIn('employees.user_id', DB::table('users')
                ->select('id')
                ->whereNotNull('username')
                ->where('username', '!=', ''))
            ->update(['employees.show_on_team' => true]);
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('show_on_team');
        });
    }
};

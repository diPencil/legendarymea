<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('name')->after('id')->nullable();
        });

        // Copy names from users to employees
        DB::table('employees')
            ->join('users', 'employees.user_id', '=', 'users.id')
            ->update(['employees.name' => DB::raw('users.name')]);

        Schema::table('employees', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            
            // In SQLite changing foreign key constraints can be tricky.
            // We just make it nullable.
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('name');
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};

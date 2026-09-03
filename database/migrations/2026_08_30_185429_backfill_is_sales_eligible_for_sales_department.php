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
        DB::table('employees')->where('department', 'Sales')->update(['is_sales_eligible' => true]);
        DB::table('employees')->where('department', '!=', 'Sales')->update(['is_sales_eligible' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No specific down action needed as we just backfilled data.
    }
};

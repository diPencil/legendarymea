<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('is_sales_eligible')->default(false)->after('status');
            $table->index(['status', 'is_sales_eligible']);
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['status', 'is_sales_eligible']);
            $table->dropColumn('is_sales_eligible');
        });
    }
};

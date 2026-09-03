<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('contracts', 'contract_content')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->json('contract_content')->nullable()->after('notes');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('contracts', 'contract_content')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->dropColumn('contract_content');
            });
        }
    }
};

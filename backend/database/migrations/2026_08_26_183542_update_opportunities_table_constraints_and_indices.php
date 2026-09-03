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
        Schema::table('opportunities', function (Blueprint $table) {
            // Drop cascading foreign keys
            $table->dropForeign(['company_id']);
            $table->dropForeign(['owner_id']);
            
            // Re-add foreign keys with restrictOnDelete to avoid destructive cascades
            $table->foreign('company_id')->references('id')->on('companies')->restrictOnDelete();
            $table->foreign('owner_id')->references('id')->on('employees')->restrictOnDelete();

            // Add indices
            $table->index('stage');
            $table->index('service_interest');
            $table->index('expected_close_date');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropIndex(['stage']);
            $table->dropIndex(['service_interest']);
            $table->dropIndex(['expected_close_date']);
            $table->dropIndex(['created_at']);

            $table->dropForeign(['company_id']);
            $table->dropForeign(['owner_id']);

            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('owner_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }
};

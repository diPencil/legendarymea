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
        Schema::table('leads', function (Blueprint $table) {
            $table->index('status');
            $table->index('priority');
            $table->index('source');
            $table->index('service_interest');
            $table->index('next_follow_up_at');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['priority']);
            $table->dropIndex(['source']);
            $table->dropIndex(['service_interest']);
            $table->dropIndex(['next_follow_up_at']);
            $table->dropIndex(['created_at']);
        });
    }
};

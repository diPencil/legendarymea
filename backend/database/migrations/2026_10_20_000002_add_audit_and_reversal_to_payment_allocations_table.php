<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_allocations', function (Blueprint $table) {
            if (!Schema::hasColumn('payment_allocations', 'applied_by')) {
                $table->foreignId('applied_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payment_allocations', 'reversed_by')) {
                $table->foreignId('reversed_by')->nullable()->after('reversed_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payment_allocations', 'reversal_reason')) {
                $table->text('reversal_reason')->nullable()->after('reversed_by');
            }
            if (!Schema::hasColumn('payment_allocations', 'idempotency_key')) {
                $table->string('idempotency_key', 255)->nullable()->index()->after('reversal_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_allocations', function (Blueprint $table) {
            if (Schema::hasColumn('payment_allocations', 'applied_by')) {
                $table->dropForeign(['applied_by']);
                $table->dropColumn('applied_by');
            }
            if (Schema::hasColumn('payment_allocations', 'reversed_by')) {
                $table->dropForeign(['reversed_by']);
                $table->dropColumn('reversed_by');
            }
            if (Schema::hasColumn('payment_allocations', 'reversal_reason')) {
                $table->dropColumn('reversal_reason');
            }
            if (Schema::hasColumn('payment_allocations', 'idempotency_key')) {
                $table->dropIndex(['idempotency_key']);
                $table->dropColumn('idempotency_key');
            }
        });
    }
};

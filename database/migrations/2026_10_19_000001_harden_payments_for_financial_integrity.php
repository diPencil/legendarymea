<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE payments MODIFY company_id BIGINT UNSIGNED NULL');
        }

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->after('reference');
                $table->unique('idempotency_key', 'payments_idempotency_key_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'idempotency_key')) {
                $table->dropUnique('payments_idempotency_key_unique');
                $table->dropColumn('idempotency_key');
            }
        });

        // company_id intentionally remains nullable because user-customer payments require it.
    }
};

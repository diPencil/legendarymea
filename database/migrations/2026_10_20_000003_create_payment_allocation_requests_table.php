<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_allocation_requests')) {
            Schema::create('payment_allocation_requests', function (Blueprint $table) {
                $table->id();
                $table->string('idempotency_key', 255)->unique();
                $table->foreignId('payment_id')->constrained('payments')->restrictOnDelete();
                $table->timestamps();
            });
        }

        $historicalKeys = DB::table('payment_allocations')
            ->select('idempotency_key')
            ->whereNotNull('idempotency_key')
            ->groupBy('idempotency_key')
            ->pluck('idempotency_key');

        foreach ($historicalKeys as $key) {
            $paymentIds = DB::table('payment_allocations')
                ->where('idempotency_key', $key)
                ->distinct()
                ->pluck('payment_id');

            if ($paymentIds->count() !== 1) {
                throw new RuntimeException(
                    "Allocation idempotency key [{$key}] is associated with multiple payments and must be reviewed before migration."
                );
            }

            DB::table('payment_allocation_requests')->insertOrIgnore([
                'idempotency_key' => $key,
                'payment_id' => $paymentIds->first(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $newRequestsExist = DB::table('payment_allocation_requests')
            ->leftJoin('payment_allocations', function ($join) {
                $join->on('payment_allocations.idempotency_key', '=', 'payment_allocation_requests.idempotency_key')
                    ->on('payment_allocations.payment_id', '=', 'payment_allocation_requests.payment_id');
            })
            ->whereNull('payment_allocations.id')
            ->exists();

        if ($newRequestsExist) {
            throw new RuntimeException(
                'Rollback refused: payment allocation request history exists without matching allocation rows.'
            );
        }

        Schema::dropIfExists('payment_allocation_requests');
    }
};

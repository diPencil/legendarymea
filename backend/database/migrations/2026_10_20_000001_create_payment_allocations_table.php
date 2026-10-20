<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create payment_allocations table
        if (!Schema::hasTable('payment_allocations')) {
            Schema::create('payment_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payment_id')->constrained('payments')->restrictOnDelete();
                $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
                $table->decimal('amount', 18, 3);
                $table->text('notes')->nullable();
                $table->timestamp('reversed_at')->nullable();
                $table->timestamps();

                $table->index(['payment_id', 'invoice_id']);
                $table->index(['invoice_id', 'created_at']);
            });
        }

        // 2. Modify payments table to allow nullable invoice_id and add allocation totals
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE payments MODIFY invoice_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE payments MODIFY paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        }

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'allocated_amount')) {
                $table->decimal('allocated_amount', 18, 3)->default(0)->after('amount');
            }
            if (!Schema::hasColumn('payments', 'unallocated_amount')) {
                $table->decimal('unallocated_amount', 18, 3)->default(0)->after('allocated_amount');
            }
        });

        // 3. Safe Backfill of historical single-invoice payments
        DB::table('payments')->orderBy('id')->chunkById(200, function ($payments) {
            foreach ($payments as $payment) {
                if ($payment->invoice_id !== null) {
                    $exists = DB::table('payment_allocations')
                        ->where('payment_id', $payment->id)
                        ->where('invoice_id', $payment->invoice_id)
                        ->exists();

                    if (!$exists) {
                        DB::table('payment_allocations')->insert([
                            'payment_id' => $payment->id,
                            'invoice_id' => $payment->invoice_id,
                            'amount' => $payment->amount,
                            'notes' => $payment->notes,
                            'reversed_at' => $payment->reversed_at,
                            'created_at' => $payment->created_at ?? now(),
                            'updated_at' => $payment->updated_at ?? now(),
                        ]);
                    }

                    DB::table('payments')->where('id', $payment->id)->update([
                        'allocated_amount' => $payment->amount,
                        'unallocated_amount' => 0,
                    ]);
                } else {
                    DB::table('payments')->where('id', $payment->id)->update([
                        'allocated_amount' => 0,
                        'unallocated_amount' => $payment->amount,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        // Guard against destructive rollback if multi-invoice allocations or credit exists
        if (Schema::hasTable('payment_allocations')) {
            $multipleAllocations = DB::table('payment_allocations')
                ->select('payment_id')
                ->groupBy('payment_id')
                ->havingRaw('COUNT(*) > 1')
                ->exists();

            $unallocatedCredit = DB::table('payments')
                ->where('unallocated_amount', '>', 0)
                ->exists();

            if ($multipleAllocations || $unallocatedCredit) {
                throw new \RuntimeException(
                    'Rollback refused: payment_allocations contains multi-invoice allocations or unallocated credit that cannot be collapsed into single-invoice payments without data loss.'
                );
            }

            Schema::dropIfExists('payment_allocations');
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'unallocated_amount')) {
                $table->dropColumn('unallocated_amount');
            }
            if (Schema::hasColumn('payments', 'allocated_amount')) {
                $table->dropColumn('allocated_amount');
            }
        });
    }
};

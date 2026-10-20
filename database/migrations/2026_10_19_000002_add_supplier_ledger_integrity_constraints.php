<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicateUsage = DB::table('supplier_ledger_entries')
            ->select('invoice_id', 'invoice_item_id', 'type')
            ->whereNotNull('invoice_id')
            ->whereNotNull('invoice_item_id')
            ->groupBy('invoice_id', 'invoice_item_id', 'type')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        $duplicateReversal = DB::table('supplier_ledger_entries')
            ->select('reversal_of_id')
            ->whereNotNull('reversal_of_id')
            ->groupBy('reversal_of_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicateUsage || $duplicateReversal) {
            throw new \RuntimeException(
                'Supplier ledger duplicates must be reviewed before integrity constraints can be added.'
            );
        }

        Schema::table('supplier_ledger_entries', function (Blueprint $table) {
            $table->unique(
                ['invoice_id', 'invoice_item_id', 'type'],
                'supplier_ledger_invoice_item_type_unique'
            );
            $table->unique('reversal_of_id', 'supplier_ledger_reversal_of_unique');
        });

        if (DB::getDriverName() !== 'sqlite') {
            $existingIndexes = collect(DB::select('SHOW INDEX FROM supplier_ledger_entries'))->pluck('Key_name')->all();
            if (in_array('supplier_ledger_entries_reversal_of_id_foreign', $existingIndexes, true)) {
                Schema::table('supplier_ledger_entries', function (Blueprint $table) {
                    $table->dropIndex('supplier_ledger_entries_reversal_of_id_foreign');
                });
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            $existingIndexes = collect(DB::select('SHOW INDEX FROM supplier_ledger_entries'))->pluck('Key_name')->all();
            if (!in_array('supplier_ledger_entries_reversal_of_id_foreign', $existingIndexes, true)) {
                Schema::table('supplier_ledger_entries', function (Blueprint $table) {
                    $table->index('reversal_of_id', 'supplier_ledger_entries_reversal_of_id_foreign');
                });
            }
        }

        Schema::table('supplier_ledger_entries', function (Blueprint $table) {
            $table->dropUnique('supplier_ledger_invoice_item_type_unique');
            $table->dropUnique('supplier_ledger_reversal_of_unique');
        });
    }
};

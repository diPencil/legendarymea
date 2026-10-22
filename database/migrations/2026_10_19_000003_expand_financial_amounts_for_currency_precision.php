<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'leads' => ['estimated_value'],
        'opportunities' => ['estimated_value'],
        'quotations' => ['subtotal', 'discount_amount', 'tax_amount', 'total_amount'],
        'quotation_items' => ['unit_price', 'line_total'],
        'contracts' => ['contract_value'],
        'invoices' => ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'supplier_total_cost', 'gross_profit'],
        'invoice_items' => ['unit_price', 'line_total', 'purchase_unit_cost', 'converted_unit_cost', 'converted_line_cost', 'line_profit'],
        'payments' => ['amount'],
        'renewals' => ['renewal_amount'],
        'supplier_balance_accounts' => ['current_balance'],
        'supplier_ledger_entries' => ['amount', 'balance_before', 'balance_after'],
    ];

    private const TWO_DECIMAL_ROLLBACK_COLUMNS = [
        'leads' => ['estimated_value'],
        'opportunities' => ['estimated_value'],
        'quotations' => ['subtotal', 'discount_amount', 'tax_amount', 'total_amount'],
        'quotation_items' => ['unit_price', 'line_total'],
        'contracts' => ['contract_value'],
        'invoices' => ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'supplier_total_cost', 'gross_profit'],
        'payments' => ['amount'],
        'renewals' => ['renewal_amount'],
        'supplier_balance_accounts' => ['current_balance'],
        'supplier_ledger_entries' => ['amount', 'balance_before', 'balance_after'],
    ];

    public function up(): void
    {
        $this->assertExpectedSchema();

        Schema::table('leads', fn (Blueprint $table) => $table->decimal('estimated_value', 16, 3)->nullable()->change());
        Schema::table('opportunities', fn (Blueprint $table) => $table->decimal('estimated_value', 16, 3)->nullable()->change());
        Schema::table('quotations', function (Blueprint $table) {
            foreach (['subtotal', 'discount_amount', 'tax_amount', 'total_amount'] as $column) {
                $table->decimal($column, 16, 3)->default(0)->change();
            }
        });
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->decimal('unit_price', 16, 3)->change();
            $table->decimal('line_total', 16, 3)->change();
        });
        Schema::table('contracts', fn (Blueprint $table) => $table->decimal('contract_value', 16, 3)->nullable()->change());
        Schema::table('invoices', function (Blueprint $table) {
            foreach (['subtotal', 'discount_amount', 'tax_amount', 'total_amount'] as $column) {
                $table->decimal($column, 16, 3)->default(0)->change();
            }
            $table->decimal('supplier_total_cost', 19, 3)->default(0)->change();
            $table->decimal('gross_profit', 19, 3)->default(0)->change();
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('unit_price', 16, 4)->default(0)->change();
            $table->decimal('line_total', 19, 4)->default(0)->change();
            foreach (['purchase_unit_cost', 'converted_unit_cost', 'converted_line_cost', 'line_profit'] as $column) {
                $table->decimal($column, 19, 4)->default(0)->change();
            }
        });
        Schema::table('payments', fn (Blueprint $table) => $table->decimal('amount', 13, 3)->change());
        Schema::table('renewals', fn (Blueprint $table) => $table->decimal('renewal_amount', 13, 3)->nullable()->change());
        Schema::table('supplier_balance_accounts', fn (Blueprint $table) => $table->decimal('current_balance', 19, 3)->default(0)->change());
        Schema::table('supplier_ledger_entries', function (Blueprint $table) {
            foreach (['amount', 'balance_before', 'balance_after'] as $column) {
                $table->decimal($column, 19, 3)->change();
            }
        });
    }

    public function down(): void
    {
        $this->assertNoThirdDecimalData();

        Schema::table('leads', fn (Blueprint $table) => $table->decimal('estimated_value', 15, 2)->nullable()->change());
        Schema::table('opportunities', fn (Blueprint $table) => $table->decimal('estimated_value', 15, 2)->nullable()->change());
        Schema::table('quotations', function (Blueprint $table) {
            foreach (['subtotal', 'discount_amount', 'tax_amount', 'total_amount'] as $column) {
                $table->decimal($column, 15, 2)->default(0)->change();
            }
        });
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->decimal('unit_price', 15, 2)->change();
            $table->decimal('line_total', 15, 2)->change();
        });
        Schema::table('contracts', fn (Blueprint $table) => $table->decimal('contract_value', 15, 2)->nullable()->change());
        Schema::table('invoices', function (Blueprint $table) {
            foreach (['subtotal', 'discount_amount', 'tax_amount', 'total_amount'] as $column) {
                $table->decimal($column, 15, 2)->default(0)->change();
            }
            $table->decimal('supplier_total_cost', 18, 2)->default(0)->change();
            $table->decimal('gross_profit', 18, 2)->default(0)->change();
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('unit_price', 15, 4)->default(0)->change();
            $table->decimal('line_total', 18, 4)->default(0)->change();
            foreach (['purchase_unit_cost', 'converted_unit_cost', 'converted_line_cost', 'line_profit'] as $column) {
                $table->decimal($column, 18, 4)->default(0)->change();
            }
        });
        Schema::table('payments', fn (Blueprint $table) => $table->decimal('amount', 12, 2)->change());
        Schema::table('renewals', fn (Blueprint $table) => $table->decimal('renewal_amount', 12, 2)->nullable()->change());
        Schema::table('supplier_balance_accounts', fn (Blueprint $table) => $table->decimal('current_balance', 18, 2)->default(0)->change());
        Schema::table('supplier_ledger_entries', function (Blueprint $table) {
            foreach (['amount', 'balance_before', 'balance_after'] as $column) {
                $table->decimal($column, 18, 2)->change();
            }
        });
    }

    private function assertExpectedSchema(): void
    {
        foreach (self::COLUMNS as $table => $columns) {
            if (!Schema::hasTable($table)) {
                throw new \RuntimeException("Cannot widen monetary precision: missing table {$table}.");
            }
            foreach ($columns as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    throw new \RuntimeException("Cannot widen monetary precision: missing {$table}.{$column}.");
                }
            }
        }
    }

    private function assertNoThirdDecimalData(): void
    {
        foreach (self::TWO_DECIMAL_ROLLBACK_COLUMNS as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            $hasId = Schema::hasColumn($table, 'id');

            foreach ($columns as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    continue;
                }

                $query = DB::table($table)->whereNotNull($column);
                $query->whereRaw("ROUND({$column}, 2) != {$column}");

                if ($hasId) {
                    $query->select('id', $column);
                } else {
                    $query->select($column);
                }

                $violatingRow = $query->first();

                if ($violatingRow !== null) {
                    $rowIdentifier = $hasId ? "at row {$violatingRow->id}" : 'in existing records';
                    $val = (string) $violatingRow->{$column};
                    throw new \RuntimeException(
                        "Rollback refused: {$table}.{$column} contains three-decimal monetary data (value '{$val}' {$rowIdentifier}). Silent precision reduction would truncate financial data."
                    );
                }
            }
        }
    }
};

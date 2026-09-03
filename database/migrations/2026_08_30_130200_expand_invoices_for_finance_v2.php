<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('customer_type', 20)->default('company')->after('reference');
            $table->foreignId('customer_user_id')->nullable()->after('company_id')->constrained('users')->nullOnDelete();
            $table->foreignId('sold_by_employee_id')->nullable()->after('customer_user_id')->constrained('employees')->nullOnDelete();
            $table->string('billing_name')->nullable()->after('currency');
            $table->string('billing_email')->nullable()->after('billing_name');
            $table->string('billing_phone')->nullable()->after('billing_email');
            $table->text('billing_address')->nullable()->after('billing_phone');
            $table->string('sales_employee_name_snapshot')->nullable()->after('billing_address');
            $table->decimal('supplier_total_cost', 18, 2)->default(0)->after('total_amount');
            $table->decimal('gross_profit', 18, 2)->default(0)->after('supplier_total_cost');
            $table->decimal('gross_margin', 8, 4)->nullable()->after('gross_profit');
            $table->text('internal_notes')->nullable()->after('notes');

            $table->index(['customer_type', 'customer_user_id']);
            $table->index('sold_by_employee_id');
        });

        DB::statement('ALTER TABLE invoices MODIFY company_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['customer_user_id']);
            $table->dropForeign(['sold_by_employee_id']);
            $table->dropIndex(['customer_type', 'customer_user_id']);
            $table->dropIndex(['sold_by_employee_id']);
            $table->dropColumn([
                'customer_type',
                'customer_user_id',
                'sold_by_employee_id',
                'billing_name',
                'billing_email',
                'billing_phone',
                'billing_address',
                'sales_employee_name_snapshot',
                'supplier_total_cost',
                'gross_profit',
                'gross_margin',
                'internal_notes',
            ]);
        });
    }
};

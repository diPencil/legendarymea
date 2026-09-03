<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->string('service_type', 64)->nullable()->after('description');
            $table->string('service_name_snapshot')->nullable()->after('service_type');
            $table->text('service_details')->nullable()->after('service_name_snapshot');
            $table->date('service_start_date')->nullable()->after('service_details');
            $table->date('service_end_date')->nullable()->after('service_start_date');
            $table->string('booking_reference')->nullable()->after('service_end_date');
            $table->foreignId('supplier_id')->nullable()->after('booking_reference')->constrained('suppliers')->nullOnDelete();
            $table->decimal('purchase_unit_cost', 18, 2)->default(0)->after('unit_price');
            $table->string('purchase_currency', 3)->nullable()->after('purchase_unit_cost');
            $table->decimal('exchange_rate', 18, 8)->nullable()->after('purchase_currency');
            $table->decimal('converted_unit_cost', 18, 2)->default(0)->after('exchange_rate');
            $table->decimal('converted_line_cost', 18, 2)->default(0)->after('line_total');
            $table->decimal('line_profit', 18, 2)->default(0)->after('converted_line_cost');
            $table->decimal('line_margin', 8, 4)->nullable()->after('line_profit');

            $table->index('supplier_id');
            $table->index('service_type');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['supplier_id']);
            $table->dropIndex(['service_type']);
            $table->dropColumn([
                'service_type',
                'service_name_snapshot',
                'service_details',
                'service_start_date',
                'service_end_date',
                'booking_reference',
                'supplier_id',
                'purchase_unit_cost',
                'purchase_currency',
                'exchange_rate',
                'converted_unit_cost',
                'converted_line_cost',
                'line_profit',
                'line_margin',
            ]);
        });
    }
};

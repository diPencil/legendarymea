<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE invoice_items MODIFY unit_price DECIMAL(15,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE invoice_items MODIFY purchase_unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE invoice_items MODIFY converted_unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE invoice_items MODIFY line_total DECIMAL(18,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE invoice_items MODIFY converted_line_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000');
        DB::statement('ALTER TABLE invoice_items MODIFY line_profit DECIMAL(18,4) NOT NULL DEFAULT 0.0000');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE invoice_items MODIFY unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE invoice_items MODIFY purchase_unit_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE invoice_items MODIFY converted_unit_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE invoice_items MODIFY line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE invoice_items MODIFY converted_line_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE invoice_items MODIFY line_profit DECIMAL(18,2) NOT NULL DEFAULT 0.00');
    }
};

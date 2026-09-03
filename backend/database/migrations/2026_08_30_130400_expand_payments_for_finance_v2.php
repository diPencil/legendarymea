<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('customer_type', 20)->default('company')->after('invoice_id');
            $table->foreignId('customer_user_id')->nullable()->after('company_id')->constrained('users')->nullOnDelete();
            $table->index(['customer_type', 'customer_user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['customer_user_id']);
            $table->dropIndex(['customer_type', 'customer_user_id']);
            $table->dropColumn(['customer_type', 'customer_user_id']);
        });
    }
};

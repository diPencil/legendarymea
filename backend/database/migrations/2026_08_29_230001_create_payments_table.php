<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('invoice_id')->constrained('invoices');
            $table->foreignId('company_id')->constrained('companies');
            $table->string('status', 30);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3);
            $table->string('method', 30);
            $table->string('transaction_reference')->nullable();
            $table->timestamp('paid_at');
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users');
            $table->timestamp('reversed_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users');
            $table->text('reversal_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'paid_at']);
            $table->index(['company_id', 'invoice_id']);
            $table->index(['method', 'currency']);
            $table->index('recorded_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

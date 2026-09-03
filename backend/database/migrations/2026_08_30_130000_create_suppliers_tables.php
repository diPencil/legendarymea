<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('type', 20);
            $table->foreignId('linked_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('linked_company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('mobile')->nullable();
            $table->string('email')->nullable();
            $table->string('status', 20)->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['linked_user_id', 'status']);
            $table->index(['linked_company_id', 'status']);
        });

        Schema::create('supplier_balance_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('currency', 3);
            $table->decimal('current_balance', 18, 2)->default(0);
            $table->timestamps();

            $table->unique(['supplier_id', 'currency']);
        });

        Schema::create('supplier_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->foreignId('supplier_balance_account_id')->constrained('supplier_balance_accounts')->restrictOnDelete();
            $table->string('currency', 3);
            $table->string('type', 32);
            $table->string('direction', 20);
            $table->decimal('amount', 18, 2);
            $table->decimal('balance_before', 18, 2);
            $table->decimal('balance_after', 18, 2);
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('invoice_item_id')->nullable()->constrained('invoice_items')->nullOnDelete();
            $table->date('transaction_date');
            $table->string('payment_method', 32)->nullable();
            $table->string('external_reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reversal_of_id')->nullable()->constrained('supplier_ledger_entries')->nullOnDelete();
            $table->timestamps();

            $table->index(['supplier_id', 'transaction_date']);
            $table->index(['currency', 'transaction_date']);
            $table->index('invoice_id');
            $table->index('invoice_item_id');
            $table->index(['type', 'transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_ledger_entries');
        Schema::dropIfExists('supplier_balance_accounts');
        Schema::dropIfExists('suppliers');
    }
};

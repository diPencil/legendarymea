<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('renewals', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('contract_id')->constrained('contracts');
            $table->foreignId('active_service_id')->nullable()->constrained('active_services');
            $table->string('status', 30);
            $table->date('renewal_due_date');
            $table->date('proposed_start_date')->nullable();
            $table->date('proposed_end_date')->nullable();
            $table->decimal('renewal_amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->foreignId('renewed_contract_id')->nullable()->constrained('contracts');
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['contract_id', 'status']);
            $table->index(['company_id', 'renewal_due_date']);
            $table->index(['assigned_to', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('renewals');
    }
};

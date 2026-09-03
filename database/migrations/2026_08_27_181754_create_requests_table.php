<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('contact_id')->nullable()->constrained('contacts');
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities');
            $table->foreignId('assigned_to')->nullable()->constrained('employees');
            
            $table->string('title');
            $table->text('description')->nullable();
            
            $table->string('service_interest')->nullable()->index();
            $table->string('status')->default('new')->index();
            $table->string('priority')->default('normal')->index();
            
            $table->dateTime('due_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};

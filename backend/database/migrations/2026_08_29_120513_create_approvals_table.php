<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('quotation_id')->constrained('quotations')->cascadeOnDelete();
            
            $table->string('status')->default('pending');
            
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            
            $table->text('request_note')->nullable();
            $table->text('decision_note')->nullable();
            
            $table->timestamp('requested_at');
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approvals');
    }
};

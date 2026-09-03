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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique(); // LM-DOC-YYYY-XXXXXX
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('original_name');
            $table->string('file_path');
            $table->string('disk')->default('private');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->foreignId('created_by')->constrained('users');
            
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->nullOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('requests')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('follow_up_id')->nullable()->constrained('follow_ups')->nullOnDelete();
            $table->foreignId('note_id')->nullable()->constrained('notes')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

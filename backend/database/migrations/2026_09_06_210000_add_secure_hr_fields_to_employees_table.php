<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('personal_email')->nullable()->after('country_code');
            $table->text('bank_account_number')->nullable()->after('personal_email');
            $table->text('national_address')->nullable()->after('bank_account_number');
            $table->string('identity_document_path')->nullable()->after('national_address');
            $table->string('identity_document_original_name')->nullable()->after('identity_document_path');
            $table->string('identity_document_mime_type')->nullable()->after('identity_document_original_name');
            $table->unsignedBigInteger('identity_document_size')->nullable()->after('identity_document_mime_type');
            $table->foreignId('identity_document_uploaded_by')->nullable()->after('identity_document_size')->constrained('users')->nullOnDelete();
            $table->timestamp('identity_document_uploaded_at')->nullable()->after('identity_document_uploaded_by');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('identity_document_uploaded_by');
            $table->dropColumn([
                'personal_email',
                'bank_account_number',
                'national_address',
                'identity_document_path',
                'identity_document_original_name',
                'identity_document_mime_type',
                'identity_document_size',
                'identity_document_uploaded_at',
            ]);
        });
    }
};

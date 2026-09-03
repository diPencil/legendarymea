<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_templates', function (Blueprint $table) {
            $table->string('key')->nullable()->after('name');
            $table->string('subject_en')->nullable()->after('key');
            $table->string('subject_ar')->nullable()->after('subject_en');
            $table->longText('body_en')->nullable()->after('body');
            $table->longText('body_ar')->nullable()->after('body_en');
            $table->boolean('is_active')->default(true)->after('body_ar');
        });

        DB::table('email_templates')->orderBy('id')->get()->each(function (object $template): void {
            DB::table('email_templates')
                ->where('id', $template->id)
                ->update([
                    'key' => sprintf('template-%d', $template->id),
                    'subject_en' => $template->subject,
                    'subject_ar' => $template->subject,
                    'body_en' => $template->body,
                    'body_ar' => $template->body,
                ]);
        });

        Schema::table('email_templates', function (Blueprint $table) {
            $table->string('key')->nullable(false)->change();
            $table->string('subject_en')->nullable(false)->change();
            $table->string('subject_ar')->nullable(false)->change();
            $table->longText('body_en')->nullable(false)->change();
            $table->longText('body_ar')->nullable(false)->change();
            $table->unique('key');
        });

        Schema::table('email_messages', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('id');
            $table->string('to_name')->nullable()->after('to_address');
            $table->text('cc')->nullable()->after('to_name');
            $table->text('bcc')->nullable()->after('cc');
            $table->foreignId('inquiry_id')->nullable()->after('template_id')->constrained('inquiries')->nullOnDelete();
            $table->text('failure_message')->nullable()->after('sent_at');
        });

        DB::table('email_messages')->orderBy('id')->get()->each(function (object $email): void {
            DB::table('email_messages')
                ->where('id', $email->id)
                ->update([
                    'reference' => sprintf('LM-EML-%s-%06d', date('Y', strtotime((string) $email->created_at ?: 'now')), $email->id),
                ]);
        });

        Schema::table('email_messages', function (Blueprint $table) {
            $table->string('reference')->nullable(false)->change();
            $table->unique('reference');
        });
    }

    public function down(): void
    {
        Schema::table('email_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inquiry_id');
            $table->dropUnique(['reference']);
            $table->dropColumn(['reference', 'to_name', 'cc', 'bcc', 'failure_message']);
        });

        Schema::table('email_templates', function (Blueprint $table) {
            $table->dropUnique(['key']);
            $table->dropColumn(['key', 'subject_en', 'subject_ar', 'body_en', 'body_ar', 'is_active']);
        });
    }
};

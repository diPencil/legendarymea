<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('careers', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('id');
            $table->string('department')->nullable()->after('title');
            $table->string('status')->default('draft')->after('requirements');
            $table->timestamp('published_at')->nullable()->after('status');
            $table->date('closing_date')->nullable()->after('published_at');
            $table->foreignId('created_by')->nullable()->after('closing_date')->constrained('users')->nullOnDelete();
        });

        DB::table('careers')->orderBy('id')->get()->each(function (object $career): void {
            $isActive = (bool) ($career->is_active ?? false);
            DB::table('careers')
                ->where('id', $career->id)
                ->update([
                    'reference' => sprintf('LM-CAR-%s-%06d', date('Y', strtotime((string) $career->created_at ?: 'now')), $career->id),
                    'status' => $isActive ? 'published' : 'draft',
                    'published_at' => $isActive ? ($career->created_at ?? now()) : null,
                ]);
        });

        Schema::table('careers', function (Blueprint $table) {
            $table->string('reference')->nullable(false)->change();
            $table->unique('reference');
        });

        Schema::table('career_applications', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('id');
            $table->foreignId('assigned_to')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->text('internal_notes')->nullable()->after('assigned_to');
        });

        DB::table('career_applications')->orderBy('id')->get()->each(function (object $application): void {
            DB::table('career_applications')
                ->where('id', $application->id)
                ->update([
                    'reference' => sprintf('LM-CAP-%s-%06d', date('Y', strtotime((string) $application->created_at ?: 'now')), $application->id),
                ]);
        });

        Schema::table('career_applications', function (Blueprint $table) {
            $table->string('reference')->nullable(false)->change();
            $table->unique('reference');
        });
    }

    public function down(): void
    {
        Schema::table('career_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_to');
            $table->dropUnique(['reference']);
            $table->dropColumn(['reference', 'internal_notes']);
        });

        Schema::table('careers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropUnique(['reference']);
            $table->dropColumn(['reference', 'department', 'status', 'published_at', 'closing_date']);
        });
    }
};

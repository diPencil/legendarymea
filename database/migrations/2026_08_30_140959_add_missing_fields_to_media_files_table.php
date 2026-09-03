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
        Schema::table('media_files', function (Blueprint $table) {
            $table->string('reference')->unique()->nullable()->after('id');
            $table->string('type')->default('document')->after('reference');
            $table->integer('width')->nullable()->after('size');
            $table->integer('height')->nullable()->after('width');
            $table->string('alt_text_en')->nullable()->after('height');
            $table->string('alt_text_ar')->nullable()->after('alt_text_en');
            $table->text('caption_en')->nullable()->after('alt_text_ar');
            $table->text('caption_ar')->nullable()->after('caption_en');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media_files', function (Blueprint $table) {
            $table->dropColumn([
                'reference',
                'type',
                'width',
                'height',
                'alt_text_en',
                'alt_text_ar',
                'caption_en',
                'caption_ar'
            ]);
        });
    }
};

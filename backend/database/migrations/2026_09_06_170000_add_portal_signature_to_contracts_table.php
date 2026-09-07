<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->string('first_party_name_en')->nullable()->after('payment_terms_ar');
            $table->string('first_party_name_ar')->nullable()->after('first_party_name_en');
            $table->date('first_party_date')->nullable()->after('first_party_name_ar');
            $table->string('second_party_name_en')->nullable()->after('first_party_date');
            $table->string('second_party_name_ar')->nullable()->after('second_party_name_en');
            $table->date('second_party_date')->nullable()->after('second_party_name_ar');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn([
                'first_party_name_en',
                'first_party_name_ar',
                'first_party_date',
                'second_party_name_en',
                'second_party_name_ar',
                'second_party_date',
            ]);
        });
    }
};

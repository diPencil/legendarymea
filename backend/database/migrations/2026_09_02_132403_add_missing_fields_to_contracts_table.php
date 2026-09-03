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
        foreach ($this->columns() as $column) {
            if (!Schema::hasColumn('contracts', $column)) {
                Schema::table('contracts', function (Blueprint $table) use ($column) {
                    $table->text($column)->nullable();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->columns() as $column) {
            if (Schema::hasColumn('contracts', $column)) {
                Schema::table('contracts', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }

    private function columns(): array
    {
        return [
            'additional_terms_en',
            'additional_terms_ar',
            'scope_of_work_en',
            'scope_of_work_ar',
            'payment_terms_en',
            'payment_terms_ar',
        ];
    }
};

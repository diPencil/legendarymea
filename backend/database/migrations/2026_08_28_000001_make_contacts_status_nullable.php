<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE contacts MODIFY status VARCHAR(255) NULL DEFAULT "active"');
    }

    public function down(): void
    {
        DB::table('contacts')->whereNull('status')->update(['status' => 'active']);
        DB::statement('ALTER TABLE contacts MODIFY status VARCHAR(255) NOT NULL DEFAULT "active"');
    }
};

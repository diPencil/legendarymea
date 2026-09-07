<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->timestamp('portal_invited_at')->nullable()->after('last_login_at');
            $table->timestamp('portal_disabled_at')->nullable()->after('portal_invited_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn(['company_id', 'must_change_password', 'portal_invited_at', 'portal_disabled_at']);
        });
    }
};

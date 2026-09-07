<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_invite_status')->nullable()->after('must_change_password');
            $table->timestamp('account_invited_at')->nullable()->after('account_invite_status');
            $table->timestamp('account_invite_failed_at')->nullable()->after('account_invited_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['account_invite_status', 'account_invited_at', 'account_invite_failed_at']);
        });
    }
};

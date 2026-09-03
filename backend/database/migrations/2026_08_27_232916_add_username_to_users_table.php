<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First add the column as nullable
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->after('name');
        });

        // Backfill usernames for existing users based on email
        $users = DB::table('users')->whereNull('username')->get();
        foreach ($users as $user) {
            $baseUsername = Str::before($user->email, '@');
            // Normalize: lowercase, replace spaces/invalid chars with empty string, trim
            $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9.\-_]/', '', $baseUsername));
            if (empty($baseUsername)) {
                $baseUsername = 'user';
            }
            
            $username = $baseUsername;
            $counter = 1;
            
            // Check uniqueness in the database
            while (DB::table('users')->where('username', $username)->exists()) {
                $username = $baseUsername . $counter;
                $counter++;
            }
            
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }

        // Now enforce unique and not null
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable(false)->unique()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};

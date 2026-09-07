<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $templates = DB::table('email_templates')->get();

        foreach ($templates as $template) {
            $updated = [];
            
            foreach (['body', 'body_en', 'body_ar'] as $field) {
                if (!empty($template->$field) && stripos($template->$field, '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">') !== false) {
                    // Extract everything inside this specific inner table row td
                    $pattern = '/<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">\s*<tr>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>\s*<\/table>/is';
                    if (preg_match($pattern, $template->$field, $matches)) {
                        $updated[$field] = trim($matches[1]);
                    }
                }
            }

            if (!empty($updated)) {
                DB::table('email_templates')->where('id', $template->id)->update($updated);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_templates', function (Blueprint $table) {
            //
        });
    }
};

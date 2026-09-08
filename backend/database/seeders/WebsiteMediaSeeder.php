<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class WebsiteMediaSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->call('legendary:import-website-media', [
            '--frontend-url' => config('app.frontend_url'),
        ]);
    }
}

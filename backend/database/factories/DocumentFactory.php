<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    protected $model = Document::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-DOC-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'original_name' => $this->faker->word() . '.pdf',
            'file_path' => 'documents/' . $this->faker->uuid() . '.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size' => $this->faker->numberBetween(1024, 10485760), // 1KB to 10MB
            'created_by' => User::factory(),
        ];
    }
}

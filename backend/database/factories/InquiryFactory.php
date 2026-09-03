<?php

namespace Database\Factories;

use App\Enums\InquiryStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Inquiry>
 */
class InquiryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-INQ-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'name' => $this->faker->name(),
            'email' => $this->faker->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'subject' => $this->faker->sentence(),
            'message' => $this->faker->paragraph(),
            'status' => InquiryStatus::NEW,
            'assigned_to' => null,
            'internal_notes' => null,
            'resolved_at' => null,
            'created_by' => null,
        ];
    }
}

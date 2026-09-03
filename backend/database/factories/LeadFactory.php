<?php

namespace Database\Factories;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-LEAD-' . $this->faker->unique()->numberBetween(1000, 999999),
            'person_name' => $this->faker->name(),
            'company_name' => $this->faker->company(),
            'email' => $this->faker->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'source' => \App\Enums\LeadSource::WEBSITE->value,
            'service_interest' => \App\Enums\ServiceInterest::GENERAL_BUSINESS->value,
            'status' => \App\Enums\LeadStatus::NEW->value,
            'priority' => \App\Enums\LeadPriority::NORMAL->value,
            'estimated_value' => $this->faker->randomFloat(2, 1000, 50000),
            'currency' => 'AED',
            'next_follow_up_at' => now()->addDays(2),
            'notes' => $this->faker->sentence(),
            'company_id' => null,
            'contact_id' => null,
            'assigned_to' => null,
            'created_by' => null,
        ];
    }
}

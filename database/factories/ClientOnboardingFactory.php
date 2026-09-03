<?php

namespace Database\Factories;

use App\Enums\ClientOnboardingStatus;
use App\Models\Company;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientOnboardingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'LM-ONB-' . $this->faker->year . '-' . $this->faker->unique()->numerify('######'),
            'company_id' => Company::factory(),
            'contract_id' => Contract::factory(),
            'status' => ClientOnboardingStatus::DRAFT,
            'assigned_to' => null,
            'kickoff_date' => null,
            'target_go_live_date' => null,
            'completed_at' => null,
            'requirements' => null,
            'notes' => null,
            'created_by' => User::factory(),
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ClientOnboardingStatus::IN_PROGRESS,
            'kickoff_date' => now()->addDays(1),
            'target_go_live_date' => now()->addDays(14),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ClientOnboardingStatus::COMPLETED,
            'completed_at' => now(),
            'kickoff_date' => now()->subDays(10),
            'target_go_live_date' => now()->addDays(4),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ClientOnboardingStatus::CANCELLED,
            'completed_at' => null,
        ]);
    }
}

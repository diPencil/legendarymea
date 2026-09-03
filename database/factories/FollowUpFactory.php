<?php

namespace Database\Factories;

use App\Enums\FollowUpStatus;
use App\Models\FollowUp;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class FollowUpFactory extends Factory
{
    protected $model = FollowUp::class;

    public function definition(): array
    {
        return [
            'reference' => 'LM-FUP-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'title' => $this->faker->sentence(4),
            'notes' => $this->faker->optional()->paragraph(),
            'status' => FollowUpStatus::PENDING,
            'follow_up_at' => $this->faker->dateTimeBetween('now', '+1 month'),
            'completed_at' => null,
            'created_by' => User::factory(),
            
            // CRM fields are optional by default for a standalone FollowUp.
            'company_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'task_id' => null,
            
            'assigned_to' => null,
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Approval;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ApprovalStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class ApprovalFactory extends Factory
{
    protected $model = Approval::class;

    public function definition(): array
    {
        return [
            'reference' => 'LM-APR-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'quotation_id' => Quotation::factory(),
            'status' => ApprovalStatus::PENDING,
            'requested_by' => User::factory(),
            'assigned_to' => null,
            'request_note' => $this->faker->optional()->sentence(),
            'decision_note' => null,
            'requested_at' => now(),
            'decided_at' => null,
            'decided_by' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApprovalStatus::APPROVED,
            'decided_by' => User::factory(),
            'decided_at' => now(),
            'decision_note' => $this->faker->optional()->sentence(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApprovalStatus::REJECTED,
            'decided_by' => User::factory(),
            'decided_at' => now(),
            'decision_note' => $this->faker->sentence(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApprovalStatus::CANCELLED,
            'decided_by' => null,
            'decided_at' => null,
            'decision_note' => null,
        ]);
    }
}

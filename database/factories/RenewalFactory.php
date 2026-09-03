<?php

namespace Database\Factories;

use App\Enums\RenewalStatus;
use App\Models\Company;
use App\Models\Contract;
use App\Models\Renewal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RenewalFactory extends Factory
{
    protected $model = Renewal::class;

    public function definition(): array
    {
        return [
            'reference' => 'LM-RNW-' . date('Y') . '-' . str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'company_id' => Company::factory(),
            'contract_id' => Contract::factory(),
            'active_service_id' => null,
            'status' => RenewalStatus::UPCOMING,
            'renewal_due_date' => now()->addMonth()->format('Y-m-d'),
            'proposed_start_date' => now()->addMonth()->format('Y-m-d'),
            'proposed_end_date' => now()->addMonths(2)->format('Y-m-d'),
            'renewal_amount' => '1000.00',
            'currency' => 'AED',
            'assigned_to' => User::factory(),
            'renewed_contract_id' => null,
            'completed_at' => null,
            'notes' => $this->faker->optional()->sentence(),
            'created_by' => User::factory(),
        ];
    }
}

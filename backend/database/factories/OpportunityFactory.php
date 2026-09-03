<?php

namespace Database\Factories;

use App\Models\Opportunity;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Contact;
use App\Enums\OpportunityStage;
use App\Enums\ServiceInterest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class OpportunityFactory extends Factory
{
    protected $model = Opportunity::class;

    public function definition(): array
    {
        return [
            'reference' => 'LM-OPP-2026-' . $this->faker->unique()->numerify('######'),
            'company_id' => Company::factory(),
            'owner_id' => Employee::factory(),
            'name' => $this->faker->sentence(3),
            'service_interest' => $this->faker->randomElement(array_column(ServiceInterest::cases(), 'value')),
            'stage' => OpportunityStage::QUALIFICATION->value,
            'probability' => $this->faker->numberBetween(0, 100),
            'estimated_value' => $this->faker->randomFloat(2, 1000, 100000),
            'currency' => 'SAR',
            'expected_close_date' => Carbon::now()->addDays($this->faker->numberBetween(10, 60)),
        ];
    }

    public function qualification(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::QUALIFICATION->value,
            ];
        });
    }

    public function discovery(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::DISCOVERY->value,
            ];
        });
    }

    public function proposal(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::PROPOSAL->value,
            ];
        });
    }

    public function negotiation(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::NEGOTIATION->value,
            ];
        });
    }

    public function won(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::WON->value,
                'closed_at' => Carbon::now(),
                'lost_reason' => null,
            ];
        });
    }

    public function lost(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'stage' => OpportunityStage::LOST->value,
                'closed_at' => Carbon::now(),
                'lost_reason' => $this->faker->sentence(),
            ];
        });
    }
}

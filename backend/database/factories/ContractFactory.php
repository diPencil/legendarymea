<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ContractStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContractFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'LM-CTR-' . now()->year . '-' . str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'title' => 'Services Agreement',
            'company_id' => Company::factory(),
            'contact_id' => null,
            'quotation_id' => null,
            'status' => ContractStatus::DRAFT,
            'start_date' => null,
            'end_date' => null,
            'signed_at' => null,
            'contract_value' => null,
            'currency' => null,
            'terms' => null,
            'notes' => null,
            'created_by' => User::factory(),
        ];
    }

    public function active(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => ContractStatus::ACTIVE,
                'start_date' => now()->subDays(10)->format('Y-m-d'),
                'end_date' => now()->addYear()->format('Y-m-d'),
                'signed_at' => now()->subDays(11),
                'contract_value' => '10000.00',
                'currency' => 'SAR',
            ];
        });
    }

    public function expired(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => ContractStatus::EXPIRED,
                'start_date' => now()->subYear()->subDays(10)->format('Y-m-d'),
                'end_date' => now()->subDays(10)->format('Y-m-d'),
                'signed_at' => now()->subYear()->subDays(11),
                'contract_value' => '10000.00',
                'currency' => 'SAR',
            ];
        });
    }

    public function terminated(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => ContractStatus::TERMINATED,
                'start_date' => now()->subDays(30)->format('Y-m-d'),
                'end_date' => now()->addYear()->format('Y-m-d'),
                'signed_at' => now()->subDays(31),
                'contract_value' => '10000.00',
                'currency' => 'SAR',
            ];
        });
    }

    public function cancelled(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => ContractStatus::CANCELLED,
                'start_date' => null,
                'end_date' => null,
                'signed_at' => null,
            ];
        });
    }
}

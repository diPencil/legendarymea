<?php

namespace Database\Factories;

use App\Enums\QuotationStatus;
use App\Models\Company;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quotation>
 */
class QuotationFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = (string) $this->faker->randomFloat(2, 100, 50000);
        $discount = (string) $this->faker->randomFloat(2, 0, 200);
        $tax = (string) $this->faker->randomFloat(2, 0, 1000);
        $total = (string) (round((float) $subtotal - (float) $discount + (float) $tax, 2));

        return [
            'reference' => 'LM-QTN-' . now()->year . '-' . str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'company_id' => Company::factory(),
            'contact_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'status' => QuotationStatus::DRAFT,
            'currency' => $this->faker->randomElement(['SAR', 'USD', 'EUR', 'AED', 'EGP']),
            'issue_date' => null,
            'valid_until' => null,
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'total_amount' => $total,
            'notes' => $this->faker->optional()->sentence(),
            'terms' => $this->faker->optional()->sentence(),
            'created_by' => User::factory(),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => QuotationStatus::DRAFT]);
    }

    public function sent(): static
    {
        return $this->state(['status' => QuotationStatus::SENT, 'issue_date' => now()->toDateString()]);
    }

    public function accepted(): static
    {
        return $this->state(['status' => QuotationStatus::ACCEPTED]);
    }

    public function rejected(): static
    {
        return $this->state(['status' => QuotationStatus::REJECTED]);
    }

    public function expired(): static
    {
        return $this->state(['status' => QuotationStatus::EXPIRED]);
    }

    public function cancelled(): static
    {
        return $this->state(['status' => QuotationStatus::CANCELLED]);
    }
}

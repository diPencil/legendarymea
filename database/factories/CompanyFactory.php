<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-CMP-' . $this->faker->year() . '-' . str_pad($this->faker->randomNumber(6), 6, '0', STR_PAD_LEFT),
            'name' => $this->faker->company,
            'legal_name' => $this->faker->companySuffix . ' ' . $this->faker->company,
            'business_type' => $this->faker->word,
            'status' => $this->faker->randomElement(['active', 'inactive', 'archived']),
            'country_code' => $this->faker->countryCode,
            'city' => $this->faker->city,
            'website' => $this->faker->url,
            'email' => $this->faker->companyEmail,
            'phone' => $this->faker->phoneNumber,
            'tax_number' => $this->faker->numerify('TAX-#########'),
            'registration_number' => $this->faker->numerify('REG-#########'),
            'source' => $this->faker->randomElement(['website', 'referral', 'event']),
            'notes' => $this->faker->sentence,
        ];
    }
}

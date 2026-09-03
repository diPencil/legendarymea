<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'name' => fake()->name(),
            'employee_code' => 'LM-EMP-' . fake()->unique()->numerify('######'),
            'job_title' => $this->faker->jobTitle,
            'department' => $this->faker->word,
            'phone' => $this->faker->phoneNumber,
            'country_code' => $this->faker->countryCode,
            'status' => 'active',
            'is_sales_eligible' => false,
            'hire_date' => $this->faker->date(),
        ];
    }
}

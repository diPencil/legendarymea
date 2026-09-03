<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Request;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Employee;
use App\Models\User;
use App\Enums\RequestStatus;
use App\Enums\RequestPriority;
use App\Enums\ServiceInterest;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Request>
 */
class RequestFactory extends Factory
{
    protected $model = Request::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'title' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'status' => RequestStatus::NEW,
            'priority' => RequestPriority::NORMAL,
            'service_interest' => $this->faker->randomElement(ServiceInterest::cases()),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Enums\ActiveServiceStatus;
use App\Models\Company;
use App\Models\Contract;
use App\Models\ClientOnboarding;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ActiveService>
 */
class ActiveServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Safe reference generation logic (simulating what a service might do)
        // Usually handled by a service, but for factory:
        $count = $this->faker->unique()->numberBetween(1000, 9999);
        $reference = 'LM-SVC-' . date('Y') . '-' . str_pad((string)$count, 6, '0', STR_PAD_LEFT);

        return [
            'reference' => $reference,
            'title' => $this->faker->words(3, true),
            'description' => $this->faker->paragraph,
            'service_catalog_id' => ServiceCatalog::query()->where('active', true)->where('available_for_active_service', true)->value('id')
                ?? ServiceCatalog::create([
                    'code' => 'hotels_accommodation',
                    'name_en' => 'Hotels & Accommodation',
                    'name_ar' => 'الفنادق والإقامة',
                    'category' => 'travel',
                    'active' => true,
                    'show_in_contact' => true,
                    'available_for_invoice' => true,
                    'available_for_active_service' => true,
                    'sort_order' => 0,
                ])->id,
            'company_id' => Company::factory(),
            'contract_id' => function (array $attributes) {
                return Contract::factory()->active()->create([
                    'company_id' => $attributes['company_id'],
                ])->id;
            },
            'status' => ActiveServiceStatus::DRAFT,
            'created_by' => User::factory(),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActiveServiceStatus::ACTIVE,
            'start_date' => now()->subDays(5)->format('Y-m-d'),
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActiveServiceStatus::SUSPENDED,
            'start_date' => now()->subDays(10)->format('Y-m-d'),
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActiveServiceStatus::ENDED,
            'start_date' => now()->subDays(30)->format('Y-m-d'),
            'end_date' => now()->format('Y-m-d'),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ActiveServiceStatus::CANCELLED,
        ]);
    }

    public function withOnboarding(): static
    {
        return $this->afterCreating(function (\App\Models\ActiveService $service) {
            $onboarding = \App\Models\ClientOnboarding::factory()->completed()->create([
                'company_id' => $service->company_id,
                'contract_id' => $service->contract_id,
            ]);
            $service->update(['client_onboarding_id' => $onboarding->id]);
        });
    }
}

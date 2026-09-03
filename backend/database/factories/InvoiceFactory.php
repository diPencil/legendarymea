<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceCustomerType;
use App\Models\Company;
use App\Models\Contract;
use App\Models\ActiveService;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-INV-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => Company::factory(),
            'customer_user_id' => null,
            'sold_by_employee_id' => null,
            'contract_id' => null,
            'active_service_id' => null,
            'status' => InvoiceStatus::DRAFT,
            'issue_date' => null,
            'due_date' => null,
            'currency' => 'AED',
            'billing_name' => null,
            'billing_email' => null,
            'billing_phone' => null,
            'billing_address' => null,
            'sales_employee_name_snapshot' => null,
            'subtotal' => 0.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => 0.00,
            'supplier_total_cost' => 0.00,
            'gross_profit' => 0.00,
            'gross_margin' => null,
            'notes' => $this->faker->optional()->sentence,
            'internal_notes' => $this->faker->optional()->sentence,
            'terms' => $this->faker->optional()->paragraph,
            'created_by' => User::factory(),
        ];
    }

    public function issued(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => InvoiceStatus::ISSUED,
            'issue_date' => now()->subDays(10)->format('Y-m-d'),
            'due_date' => now()->addDays(20)->format('Y-m-d'),
        ]);
    }

    public function partiallyPaid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => InvoiceStatus::PARTIALLY_PAID,
            'issue_date' => now()->subDays(15)->format('Y-m-d'),
            'due_date' => now()->addDays(15)->format('Y-m-d'),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => InvoiceStatus::PAID,
            'issue_date' => now()->subDays(30)->format('Y-m-d'),
            'due_date' => now()->format('Y-m-d'),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => InvoiceStatus::OVERDUE,
            'issue_date' => now()->subDays(45)->format('Y-m-d'),
            'due_date' => now()->subDays(15)->format('Y-m-d'),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => InvoiceStatus::CANCELLED,
        ]);
    }
}

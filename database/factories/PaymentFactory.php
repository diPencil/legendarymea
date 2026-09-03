<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\InvoiceCustomerType;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'reference' => 'LM-PAY-' . date('Y') . '-' . str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'invoice_id' => Invoice::factory(),
            'customer_type' => InvoiceCustomerType::COMPANY,
            'company_id' => Company::factory(),
            'customer_user_id' => null,
            'status' => PaymentStatus::POSTED,
            'amount' => '100.00',
            'currency' => 'AED',
            'method' => PaymentMethod::BANK_TRANSFER,
            'transaction_reference' => $this->faker->optional()->bothify('TXN-#####'),
            'paid_at' => now()->subDay(),
            'notes' => $this->faker->optional()->sentence(),
            'recorded_by' => User::factory(),
            'reversed_at' => null,
            'reversed_by' => null,
            'reversal_reason' => null,
        ];
    }
}

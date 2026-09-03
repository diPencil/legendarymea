<?php

namespace Database\Factories;

use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuotationItem>
 */
class QuotationItemFactory extends Factory
{
    public function definition(): array
    {
        $quantity = (string) $this->faker->randomFloat(2, 1, 50);
        $unitPrice = (string) $this->faker->randomFloat(2, 10, 5000);
        $lineTotal = (string) round((float) $quantity * (float) $unitPrice, 2);

        return [
            'quotation_id' => Quotation::factory(),
            'description' => $this->faker->sentence(5),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_total' => $lineTotal,
            'sort_order' => 0,
        ];
    }
}

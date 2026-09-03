<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class QuotationCalculationService
{
    /**
     * Calculate the line_total for a single item.
     * Server owns this calculation; never trust client-supplied totals.
     */
    public function itemLineTotal(string|float $quantity, string|float $unitPrice): string
    {
        $qty = $this->toDecimal($quantity);
        $price = $this->toDecimal($unitPrice);

        if ($qty < 0) {
            throw new InvalidArgumentException('Quantity must be >= 0.');
        }
        if ($price < 0) {
            throw new InvalidArgumentException('Unit price must be >= 0.');
        }

        return (string) round($qty * $price, 2);
    }

    /**
     * Calculate subtotal from a collection of [quantity, unit_price] line data arrays.
     */
    public function subtotalFromLines(array $lines): string
    {
        $subtotal = '0.00';
        foreach ($lines as $line) {
            $lineTotal = $this->itemLineTotal($line['quantity'], $line['unit_price']);
            $subtotal = (string) round($this->toDecimal($subtotal) + $this->toDecimal($lineTotal), 2);
        }
        return $subtotal;
    }

    /**
     * Calculate subtotal from QuotationItem models.
     */
    public function subtotalFromItems(Collection $items): string
    {
        $subtotal = '0.00';
        foreach ($items as $item) {
            $subtotal = (string) round(
                $this->toDecimal($subtotal) + $this->toDecimal($item->line_total),
                2
            );
        }
        return $subtotal;
    }

    /**
     * Calculate the final total.
     * total = subtotal - discount_amount + tax_amount
     * Minimum total is 0.00 — discount cannot produce a negative total.
     */
    public function total(
        string|float $subtotal,
        string|float $discountAmount,
        string|float $taxAmount
    ): string {
        $sub = $this->toDecimal($subtotal);
        $discount = $this->toDecimal($discountAmount);
        $tax = $this->toDecimal($taxAmount);

        if ($discount < 0) {
            throw new InvalidArgumentException('Discount amount must be >= 0.');
        }
        if ($tax < 0) {
            throw new InvalidArgumentException('Tax amount must be >= 0.');
        }

        $total = round($sub - $discount + $tax, 2);

        // Do not allow negative totals.
        return (string) max(0.00, $total);
    }

    /**
     * Recalculate and update a Quotation's monetary fields from its persisted items.
     */
    public function recalculate(Quotation $quotation): Quotation
    {
        $items = $quotation->items;
        $subtotal = $this->subtotalFromItems($items);
        $total = $this->total($subtotal, $quotation->discount_amount, $quotation->tax_amount);

        $quotation->subtotal = $subtotal;
        $quotation->total_amount = $total;

        return $quotation;
    }

    private function toDecimal(string|float $value): float
    {
        return round((float) $value, 10);
    }
}

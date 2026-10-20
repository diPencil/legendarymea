<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Support\Decimal;
use App\Support\Money;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class QuotationCalculationService
{
    /**
     * Calculate the line_total for a single item.
     * Server owns this calculation; never trust client-supplied totals.
     */
    public function itemLineTotal(string|float $quantity, string|float $unitPrice, string $currency = 'AED'): string
    {
        if (Decimal::compare($quantity, 0) < 0) {
            throw new InvalidArgumentException('Quantity must be >= 0.');
        }
        if (Decimal::compare($unitPrice, 0) < 0) {
            throw new InvalidArgumentException('Unit price must be >= 0.');
        }

        return Money::multiply($quantity, $unitPrice, $currency);
    }

    /**
     * Calculate subtotal from a collection of [quantity, unit_price] line data arrays.
     */
    public function subtotalFromLines(array $lines, string $currency = 'AED'): string
    {
        $subtotal = Money::normalize(0, $currency);
        foreach ($lines as $line) {
            $lineTotal = $this->itemLineTotal($line['quantity'], $line['unit_price'], $currency);
            $subtotal = Money::add($subtotal, $lineTotal, $currency);
        }
        return $subtotal;
    }

    /**
     * Calculate subtotal from QuotationItem models.
     */
    public function subtotalFromItems(Collection $items, string $currency = 'AED'): string
    {
        $subtotal = Money::normalize(0, $currency);
        foreach ($items as $item) {
            $subtotal = Money::add($subtotal, $item->line_total, $currency);
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
        string|float $taxAmount,
        string $currency = 'AED'
    ): string {
        if (Decimal::compare($discountAmount, 0) < 0) {
            throw new InvalidArgumentException('Discount amount must be >= 0.');
        }
        if (Decimal::compare($taxAmount, 0) < 0) {
            throw new InvalidArgumentException('Tax amount must be >= 0.');
        }

        $total = Money::add(Money::subtract($subtotal, $discountAmount, $currency), $taxAmount, $currency);

        return Money::compare($total, 0) < 0 ? Money::normalize(0, $currency) : $total;
    }

    /**
     * Recalculate and update a Quotation's monetary fields from its persisted items.
     */
    public function recalculate(Quotation $quotation): Quotation
    {
        $items = $quotation->items;
        $subtotal = $this->subtotalFromItems($items, $quotation->currency);
        $total = $this->total($subtotal, $quotation->discount_amount, $quotation->tax_amount, $quotation->currency);

        $quotation->subtotal = $subtotal;
        $quotation->total_amount = $total;

        return $quotation;
    }
}

<?php

namespace App\Services;

use App\Support\Decimal;
use App\Support\Money;

class InvoiceFinanceCalculator
{
    public function calculateItems(array $items, string $invoiceCurrency): array
    {
        $itemsToCreate = [];
        $subtotal = Money::normalize(0, $invoiceCurrency);
        $supplierTotalCost = Decimal::normalize(0, 4);

        foreach ($items as $item) {
            $quantity = Decimal::normalize($item['quantity'], 3);
            $unitPrice = Money::normalize($item['unit_price'], $invoiceCurrency);
            $purchaseCurrency = strtoupper($item['purchase_currency'] ?? $invoiceCurrency);
            $purchaseUnitCost = Decimal::normalize($item['purchase_unit_cost'] ?? 0, 4);
            $exchangeRate = $purchaseCurrency === $invoiceCurrency
                ? Decimal::normalize(1, 8)
                : Decimal::normalize($item['exchange_rate'] ?? 1, 8);
            $lineTotal = Money::multiply($quantity, $unitPrice, $invoiceCurrency);
            $convertedUnitCost = Decimal::multiply($purchaseUnitCost, $exchangeRate, 4);
            $convertedLineCost = Decimal::multiply(
                Decimal::multiply($quantity, $purchaseUnitCost, 8),
                $exchangeRate,
                4
            );
            $lineProfit = Decimal::subtract($lineTotal, $convertedLineCost, 4);
            $lineMargin = Money::compare($lineTotal, 0) > 0
                ? Decimal::divide($lineProfit, $lineTotal, 4)
                : null;

            $subtotal = Money::add($subtotal, $lineTotal, $invoiceCurrency);
            $supplierTotalCost = Decimal::add($supplierTotalCost, $convertedLineCost, 4);

            $itemsToCreate[] = [
                'description' => $item['description'],
                'service_catalog_id' => $item['service_catalog_id'] ?? null,
                'service_type' => $item['service_type'] ?? 'general_business',
                'service_name_snapshot' => $item['service_name_snapshot'] ?? null,
                'service_details' => $item['service_details'] ?? null,
                'service_start_date' => $item['service_start_date'] ?? null,
                'service_end_date' => $item['service_end_date'] ?? null,
                'booking_reference' => $item['booking_reference'] ?? null,
                'supplier_id' => $item['supplier_id'] ?? null,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'purchase_unit_cost' => $purchaseUnitCost,
                'purchase_currency' => $purchaseCurrency,
                'exchange_rate' => $exchangeRate,
                'converted_unit_cost' => $convertedUnitCost,
                'line_total' => $lineTotal,
                'converted_line_cost' => $convertedLineCost,
                'line_profit' => $lineProfit,
                'line_margin' => $lineMargin,
                'sort_order' => $item['sort_order'] ?? 0,
                'currency' => $invoiceCurrency,
            ];
        }

        return [
            'items' => $itemsToCreate,
            'subtotal' => $subtotal,
            'supplier_total_cost' => $supplierTotalCost,
        ];
    }

    public function calculateInvoiceTotals(mixed $subtotal, mixed $supplierTotalCost, mixed $discount, mixed $tax, string $currency): array
    {
        $subtotal = Money::normalize($subtotal, $currency);
        $supplierTotalCost = Money::normalize($supplierTotalCost, $currency);
        $discount = Money::normalize($discount, $currency);
        $tax = Money::normalize($tax, $currency);
        $total = Money::add(Money::subtract($subtotal, $discount, $currency), $tax, $currency);
        $grossProfit = Money::subtract($total, $supplierTotalCost, $currency);
        $grossMargin = Money::compare($total, 0) > 0 ? Decimal::divide($grossProfit, $total, 4) : null;

        return [
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'total_amount' => $total,
            'supplier_total_cost' => $supplierTotalCost,
            'gross_profit' => $grossProfit,
            'gross_margin' => $grossMargin,
        ];
    }
}

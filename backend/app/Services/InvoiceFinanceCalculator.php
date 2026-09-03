<?php

namespace App\Services;

class InvoiceFinanceCalculator
{
    public function calculateItems(array $items, string $invoiceCurrency): array
    {
        $itemsToCreate = [];
        $subtotal = 0.0;
        $supplierTotalCost = 0.0;

        foreach ($items as $item) {
            $quantity = (float) $item['quantity'];
            $unitPrice = (float) $item['unit_price'];
            $purchaseUnitCost = (float) ($item['purchase_unit_cost'] ?? 0);
            $purchaseCurrency = strtoupper($item['purchase_currency'] ?? $invoiceCurrency);
            $exchangeRate = $purchaseCurrency === $invoiceCurrency
                ? 1.0
                : (float) ($item['exchange_rate'] ?? 1);
            $lineTotal = round($quantity * $unitPrice, 4);
            $convertedUnitCost = round($purchaseUnitCost * $exchangeRate, 4);
            $convertedLineCost = round($quantity * $purchaseUnitCost * $exchangeRate, 4);
            $lineProfit = round($lineTotal - $convertedLineCost, 4);
            $lineMargin = $lineTotal > 0 ? round($lineProfit / $lineTotal, 4) : null;

            $subtotal += $lineTotal;
            $supplierTotalCost += $convertedLineCost;

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
                'quantity' => number_format($quantity, 3, '.', ''),
                'unit_price' => number_format($unitPrice, 4, '.', ''),
                'purchase_unit_cost' => number_format($purchaseUnitCost, 4, '.', ''),
                'purchase_currency' => $purchaseCurrency,
                'exchange_rate' => number_format($exchangeRate, 8, '.', ''),
                'converted_unit_cost' => number_format($convertedUnitCost, 4, '.', ''),
                'line_total' => number_format($lineTotal, 4, '.', ''),
                'converted_line_cost' => number_format($convertedLineCost, 4, '.', ''),
                'line_profit' => number_format($lineProfit, 4, '.', ''),
                'line_margin' => $lineMargin !== null ? number_format($lineMargin, 4, '.', '') : null,
                'sort_order' => $item['sort_order'] ?? 0,
                'currency' => $invoiceCurrency,
            ];
        }

        return [
            'items' => $itemsToCreate,
            'subtotal' => round($subtotal, 2),
            'supplier_total_cost' => round($supplierTotalCost, 2),
        ];
    }

    public function calculateInvoiceTotals(float $subtotal, float $supplierTotalCost, float $discount, float $tax): array
    {
        $total = round($subtotal - $discount + $tax, 2);
        $grossProfit = round($total - $supplierTotalCost, 2);
        $grossMargin = $total > 0 ? round($grossProfit / $total, 4) : null;

        return [
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'discount_amount' => number_format($discount, 2, '.', ''),
            'tax_amount' => number_format($tax, 2, '.', ''),
            'total_amount' => number_format($total, 2, '.', ''),
            'supplier_total_cost' => number_format($supplierTotalCost, 2, '.', ''),
            'gross_profit' => number_format($grossProfit, 2, '.', ''),
            'gross_margin' => $grossMargin !== null ? number_format($grossMargin, 4, '.', '') : null,
        ];
    }
}

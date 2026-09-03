<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewSupplier = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_internal_finance', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);
        $canViewPurchaseCost = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_purchase_cost', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);
        $canViewProfit = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_profit', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);

        return [
            'id' => $this->id,
            'description' => $this->description,
            'service_catalog_id' => $this->service_catalog_id,
            'service_catalog' => $this->whenLoaded('serviceCatalog', fn () => $this->serviceCatalog ? [
                'id' => $this->serviceCatalog->id,
                'code' => $this->serviceCatalog->code,
                'name_en' => $this->serviceCatalog->name_en,
                'name_ar' => $this->serviceCatalog->name_ar,
            ] : null),
            'service_type' => $this->service_type,
            'service_name_snapshot' => $this->service_name_snapshot,
            'service_details' => $this->service_details,
            'service_start_date' => $this->service_start_date?->format('Y-m-d'),
            'service_end_date' => $this->service_end_date?->format('Y-m-d'),
            'booking_reference' => $this->booking_reference,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'line_total' => $this->line_total,
            'sort_order' => $this->sort_order,
            'supplier' => $this->when(
                $canViewSupplier,
                fn () => $this->supplier ? [
                    'id' => $this->supplier->id,
                    'reference' => $this->supplier->reference,
                    'name' => $this->supplier->name,
                ] : null
            ),
            'purchase_unit_cost' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->purchase_unit_cost
            ),
            'purchase_currency' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->purchase_currency
            ),
            'exchange_rate' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->exchange_rate
            ),
            'converted_unit_cost' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->converted_unit_cost
            ),
            'converted_line_cost' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->converted_line_cost
            ),
            'line_profit' => $this->when(
                $canViewProfit,
                fn () => $this->line_profit
            ),
            'line_margin' => $this->when(
                $canViewProfit,
                fn () => $this->line_margin
            ),
        ];
    }
}

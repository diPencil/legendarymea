<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $document = app(\App\Services\InvoiceDocumentBuilder::class)->build($this->resource);
        $canViewInternalFinance = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_internal_finance', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);
        $canViewProfit = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_profit', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);
        $canViewPurchaseCost = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_purchase_cost', 'manage_invoices', 'view_finance_reports', 'manage_finance_reports']);

        return [
            'id' => $this->id,
            'reference' => $document['reference'],
            'customer_type' => $this->customer_type->value,
            'status' => $this->status->value,
            'company' => $this->company ? [
                'id' => $this->company->id,
                'reference' => $this->company->reference,
                'name' => $this->company->name,
            ] : null,
            'customer_user' => $this->whenLoaded('customerUser', function () {
                return $this->customerUser ? [
                    'id' => $this->customerUser->id,
                    'name' => $this->customerUser->name,
                    'email' => $this->customerUser->email,
                    'username' => $this->customerUser->username,
                ] : null;
            }),
            'customer' => [
                'type' => $this->customer_type->value,
                'id' => $this->customer_type->value === 'company' ? $this->company_id : $this->customer_user_id,
                ...$document['customer'],
            ],
            
            'contract' => $this->whenLoaded('contract', function () {
                return $this->contract ? [
                    'id' => $this->contract->id,
                    'reference' => $this->contract->reference,
                    'title' => $this->contract->title,
                ] : null;
            }),
            
            'active_service' => $this->whenLoaded('activeService', function () {
                return $this->activeService ? [
                    'id' => $this->activeService->id,
                    'reference' => $this->activeService->reference,
                    'title' => $this->activeService->title,
                ] : null;
            }),

            'issue_date' => $document['issue_date'],
            'due_date' => $document['due_date'],
            'currency' => $document['currency'],

            'items' => InvoiceItemResource::collection($this->whenLoaded('items')),

            'subtotal' => $document['subtotal'],
            'discount_amount' => $document['discount_amount'],
            'tax_amount' => $document['tax_amount'],
            'total_amount' => $document['total_amount'],
            'paid_amount' => $this->when(
                $request->user()?->hasRole('super_admin') || $request->user()?->hasAnyPermission(['view_payments', 'manage_payments']),
                fn () => $document['paid_amount']
            ),
            'balance_due' => $this->when(
                $request->user()?->hasRole('super_admin') || $request->user()?->hasAnyPermission(['view_payments', 'manage_payments']),
                fn () => $document['balance_due']
            ),

            'notes' => $document['notes'],
            'terms' => $document['terms'],
            'internal_notes' => $this->when(
                $canViewInternalFinance,
                fn () => $this->internal_notes
            ),
            'sold_by_employee' => $this->whenLoaded('soldByEmployee', function () {
                return $this->soldByEmployee ? [
                    'id' => $this->soldByEmployee->id,
                    'employee_code' => $this->soldByEmployee->employee_code,
                    'name' => $this->sales_employee_name_snapshot ?? $this->soldByEmployee->user?->name,
                ] : null;
            }),
            'supplier_total_cost' => $this->when(
                $canViewPurchaseCost,
                fn () => $this->supplier_total_cost
            ),
            'gross_profit' => $this->when(
                $canViewProfit,
                fn () => $this->gross_profit
            ),
            'gross_margin' => $this->when(
                $canViewProfit,
                fn () => $this->gross_margin
            ),

            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'first_name' => $this->creator->first_name,
                    'last_name' => $this->creator->last_name,
                    'email' => $this->creator->email,
                    'username' => $this->creator->username,
                ];
            }),
            'payments' => $this->when(
                $request->user()?->hasRole('super_admin') || $request->user()?->hasAnyPermission(['view_payments', 'manage_payments']),
                fn () => PaymentResource::collection($this->whenLoaded('payments'))
            ),

            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}

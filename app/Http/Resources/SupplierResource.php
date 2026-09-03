<?php

namespace App\Http\Resources;

use App\Enums\SupplierLedgerType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewBalances = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_supplier_balances', 'fund_supplier_balances', 'manage_suppliers', 'view_finance_reports', 'manage_finance_reports']);
        $canViewLedger = $user?->hasRole('super_admin')
            || $user?->hasAnyPermission(['view_supplier_ledger', 'fund_supplier_balances', 'manage_suppliers', 'view_finance_reports', 'manage_finance_reports']);

        $balances = $this->balanceAccounts->map(function ($account) {
            $funded = (string) $account->ledgerEntries
                ->where('type', SupplierLedgerType::FUNDING)
                ->sum('amount');
            $used = (string) $account->ledgerEntries
                ->where('type', SupplierLedgerType::INVOICE_USAGE)
                ->sum('amount');

            return [
                'currency' => $account->currency,
                'funded' => number_format((float) $funded, 2, '.', ''),
                'used' => number_format((float) $used, 2, '.', ''),
                'available' => $account->current_balance,
            ];
        })->values();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'type' => $this->type->value,
            'name' => $this->name,
            'address' => $this->address,
            'mobile' => $this->mobile,
            'email' => $this->email,
            'status' => $this->status->value,
            'linked_user' => $this->whenLoaded('linkedUser', fn () => $this->linkedUser ? [
                'id' => $this->linkedUser->id,
                'name' => $this->linkedUser->name,
                'email' => $this->linkedUser->email,
                'username' => $this->linkedUser->username,
            ] : null),
            'linked_company' => $this->whenLoaded('linkedCompany', fn () => $this->linkedCompany ? [
                'id' => $this->linkedCompany->id,
                'reference' => $this->linkedCompany->reference,
                'name' => $this->linkedCompany->name,
            ] : null),
            'balances' => $this->when($canViewBalances, fn () => $balances),
            'ledger' => $this->when($canViewLedger, fn () => SupplierLedgerResource::collection($this->whenLoaded('ledgerEntries'))),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

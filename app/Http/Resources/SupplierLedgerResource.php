<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierLedgerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'currency' => $this->currency,
            'type' => $this->type->value,
            'direction' => $this->direction->value,
            'amount' => Money::normalize($this->amount, $this->currency),
            'balance_before' => Money::normalize($this->balance_before, $this->currency),
            'balance_after' => Money::normalize($this->balance_after, $this->currency),
            'transaction_date' => $this->transaction_date?->format('Y-m-d'),
            'payment_method' => $this->payment_method?->value,
            'external_reference' => $this->external_reference,
            'notes' => $this->notes,
            'invoice' => $this->whenLoaded('invoice', fn () => $this->invoice ? [
                'id' => $this->invoice->id,
                'reference' => $this->invoice->reference,
            ] : null),
            'invoice_item_id' => $this->invoice_item_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

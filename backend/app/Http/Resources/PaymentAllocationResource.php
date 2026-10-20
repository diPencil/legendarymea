<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentAllocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currency = $this->payment?->currency ?? $this->invoice?->currency ?? 'AED';

        return [
            'id' => $this->id,
            'payment_id' => $this->payment_id,
            'invoice_id' => $this->invoice_id,
            'invoice_reference' => $this->invoice?->reference,
            'amount' => Money::normalize($this->amount, $currency),
            'notes' => $this->notes,
            'applied_by' => $this->applied_by,
            'applier' => $this->applier ? [
                'id' => $this->applier->id,
                'name' => $this->applier->name,
            ] : null,
            'reversed_at' => $this->reversed_at?->toIso8601String(),
            'reversed_by' => $this->reversed_by,
            'reverser' => $this->reverser ? [
                'id' => $this->reverser->id,
                'name' => $this->reverser->name,
            ] : null,
            'reversal_reason' => $this->reversal_reason,
            'is_reversed' => $this->reversed_at !== null,
            'idempotency_key' => $this->idempotency_key,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'invoice' => $this->whenLoaded('invoice', function () {
                return $this->invoice ? [
                    'id' => $this->invoice->id,
                    'reference' => $this->invoice->reference,
                    'status' => $this->invoice->status->value,
                    'currency' => $this->invoice->currency,
                    'total_amount' => Money::normalize($this->invoice->total_amount, $this->invoice->currency),
                    'paid_amount' => $this->invoice->postedPaymentsTotal(),
                    'balance_due' => $this->invoice->balanceDue(),
                ] : null;
            }),
        ];
    }
}

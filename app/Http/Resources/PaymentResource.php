<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'customer_type' => $this->customer_type->value,
            'status' => $this->status->value,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'method' => $this->method->value,
            'transaction_reference' => $this->transaction_reference,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'notes' => $this->notes,
            'invoice' => $this->whenLoaded('invoice', function () {
                return $this->invoice ? [
                    'id' => $this->invoice->id,
                    'reference' => $this->invoice->reference,
                    'status' => $this->invoice->status->value,
                    'currency' => $this->invoice->currency,
                    'total_amount' => $this->invoice->total_amount,
                    'paid_amount' => $this->invoice->postedPaymentsTotal(),
                    'balance_due' => $this->invoice->balanceDue(),
                ] : null;
            }),
            'company' => $this->whenLoaded('company', function () {
                return $this->company ? [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ] : null;
            }),
            'customer_user' => $this->whenLoaded('customerUser', function () {
                return $this->customerUser ? [
                    'id' => $this->customerUser->id,
                    'name' => $this->customerUser->name,
                    'email' => $this->customerUser->email,
                ] : null;
            }),
            'recorder' => $this->whenLoaded('recorder', function () {
                return $this->recorder ? [
                    'id' => $this->recorder->id,
                    'name' => $this->recorder->name,
                    'email' => $this->recorder->email,
                    'username' => $this->recorder->username,
                ] : null;
            }),
            'reverser' => $this->whenLoaded('reverser', function () {
                return $this->reverser ? [
                    'id' => $this->reverser->id,
                    'name' => $this->reverser->name,
                    'email' => $this->reverser->email,
                    'username' => $this->reverser->username,
                ] : null;
            }),
            'reversed_at' => $this->reversed_at?->toIso8601String(),
            'reversal_reason' => $this->reversal_reason,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}

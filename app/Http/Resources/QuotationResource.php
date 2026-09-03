<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'reference'       => $this->reference,
            'status'          => $this->status?->value,
            'currency'        => $this->currency,

            'subtotal'        => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount'      => $this->tax_amount,
            'total_amount'    => $this->total_amount,

            'issue_date'      => $this->issue_date?->toDateString(),
            'valid_until'     => $this->valid_until?->toDateString(),

            'notes'           => $this->notes,
            'terms'           => $this->terms,

            'company' => $this->whenLoaded('company', function () {
                return $this->company ? [
                    'id'        => $this->company->id,
                    'reference' => $this->company->reference,
                    'name'      => $this->company->name,
                ] : null;
            }),

            'contact' => $this->whenLoaded('contact', function () {
                return $this->contact ? [
                    'id'        => $this->contact->id,
                    'reference' => $this->contact->reference,
                    'full_name' => $this->contact->full_name,
                    'email'     => $this->contact->email,
                ] : null;
            }),

            'opportunity' => $this->whenLoaded('opportunity', function () {
                return $this->opportunity ? [
                    'id'        => $this->opportunity->id,
                    'reference' => $this->opportunity->reference,
                    'name'      => $this->opportunity->name ?? $this->opportunity->title,
                    'stage'     => $this->opportunity->stage?->value,
                ] : null;
            }),

            'request' => $this->whenLoaded('request', function () {
                return $this->request ? [
                    'id'        => $this->request->id,
                    'reference' => $this->request->reference,
                    'title'     => $this->request->title,
                    'status'    => $this->request->status?->value,
                ] : null;
            }),

            'items' => $this->whenLoaded('items', function () {
                return QuotationItemResource::collection($this->items);
            }),

            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id'       => $this->creator->id,
                    'name'     => $this->creator->name,
                    'username' => $this->creator->username,
                ] : null;
            }),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RenewalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'renewal_due_date' => $this->renewal_due_date?->format('Y-m-d'),
            'proposed_start_date' => $this->proposed_start_date?->format('Y-m-d'),
            'proposed_end_date' => $this->proposed_end_date?->format('Y-m-d'),
            'renewal_amount' => $this->renewal_amount,
            'currency' => $this->currency,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'notes' => $this->notes,
            'company' => $this->whenLoaded('company', function () {
                return $this->company ? [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ] : null;
            }),
            'contract' => $this->whenLoaded('contract', function () {
                return $this->contract ? [
                    'id' => $this->contract->id,
                    'reference' => $this->contract->reference,
                    'title' => $this->contract->title,
                    'status' => $this->contract->status->value,
                ] : null;
            }),
            'active_service' => $this->whenLoaded('activeService', function () {
                return $this->activeService ? [
                    'id' => $this->activeService->id,
                    'reference' => $this->activeService->reference,
                    'title' => $this->activeService->title,
                ] : null;
            }),
            'assignee' => $this->whenLoaded('assignee', function () {
                return $this->assignee ? [
                    'id' => $this->assignee->id,
                    'name' => $this->assignee->name,
                    'username' => $this->assignee->username,
                ] : null;
            }),
            'renewed_contract' => $this->whenLoaded('renewedContract', function () {
                return $this->renewedContract ? [
                    'id' => $this->renewedContract->id,
                    'reference' => $this->renewedContract->reference,
                    'title' => $this->renewedContract->title,
                    'status' => $this->renewedContract->status->value,
                ] : null;
            }),
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'username' => $this->creator->username,
                ] : null;
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

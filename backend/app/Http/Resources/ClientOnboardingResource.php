<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientOnboardingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status,
            'company' => $this->whenLoaded('company', function () {
                return [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ];
            }),
            'contract' => $this->whenLoaded('contract', function () {
                return [
                    'id' => $this->contract->id,
                    'reference' => $this->contract->reference,
                    'title' => $this->contract->title,
                    'status' => $this->contract->status,
                    'start_date' => $this->contract->start_date?->format('Y-m-d'),
                    'end_date' => $this->contract->end_date?->format('Y-m-d'),
                    'currency' => $this->contract->currency,
                    'contract_value' => $this->contract->contract_value,
                ];
            }),
            'assigned_to' => $this->whenLoaded('assignee', function () {
                return $this->assignee ? [
                    'id' => $this->assignee->id,
                    'name' => $this->assignee->name,
                    'email' => $this->assignee->email,
                    'username' => $this->assignee->username,
                ] : null;
            }),
            'kickoff_date' => $this->kickoff_date?->format('Y-m-d'),
            'target_go_live_date' => $this->target_go_live_date?->format('Y-m-d'),
            'completed_at' => $this->completed_at,
            'requirements' => $this->requirements,
            'notes' => $this->notes,
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'username' => $this->creator->username,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

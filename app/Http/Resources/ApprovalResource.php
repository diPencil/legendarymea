<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value ?? clone $this->status,
            'quotation_id' => $this->quotation_id,
            'request_note' => $this->request_note,
            'decision_note' => $this->decision_note,
            'requested_at' => $this->requested_at?->toIso8601String(),
            'decided_at' => $this->decided_at?->toIso8601String(),
            
            'quotation' => $this->whenLoaded('quotation', fn () => [
                'id' => $this->quotation->id,
                'reference' => $this->quotation->reference,
                'status' => $this->quotation->status->value ?? clone $this->quotation->status,
            ]),
            
            'requester' => $this->whenLoaded('requester', fn () => [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
                'email' => $this->requester->email,
            ]),
            
            'assignee' => $this->whenLoaded('assignee', fn () => [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'email' => $this->assignee->email,
            ]),
            
            'decider' => $this->whenLoaded('decider', fn () => [
                'id' => $this->decider->id,
                'name' => $this->decider->name,
                'email' => $this->decider->email,
            ]),
            
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

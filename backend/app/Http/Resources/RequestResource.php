<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'description' => $this->description,
            'service_interest' => $this->service_interest,
            'status' => $this->status,
            'priority' => $this->priority,
            'due_at' => $this->due_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'assigned_to' => $this->assigned_to,
            'created_by' => $this->created_by,

            'company' => $this->whenLoaded('company', function () {
                return [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ];
            }),

            'contact' => $this->whenLoaded('contact', function () {
                return [
                    'id' => $this->contact->id,
                    'reference' => $this->contact->reference,
                    'first_name' => $this->contact->first_name,
                    'last_name' => $this->contact->last_name,
                ];
            }),

            'opportunity' => $this->whenLoaded('opportunity', function () {
                return [
                    'id' => $this->opportunity->id,
                    'reference' => $this->opportunity->reference,
                    'name' => $this->opportunity->name,
                ];
            }),

            'assigned_employee' => $this->whenLoaded('assignedTo', function () {
                return [
                    'id' => $this->assignedTo->id,
                    'reference' => $this->assignedTo->employee_code,
                    'user' => $this->assignedTo->user ? [
                        'id' => $this->assignedTo->user->id,
                        'name' => $this->assignedTo->user->name,
                    ] : null,
                ];
            }),

            'creator' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

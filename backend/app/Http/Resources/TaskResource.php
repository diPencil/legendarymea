<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status?->value,
            'priority' => $this->priority?->value,
            
            'due_at' => $this->due_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            
            'company' => $this->whenLoaded('company', function () {
                return $this->company ? [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ] : null;
            }),
            
            'contact' => $this->whenLoaded('contact', function () {
                return $this->contact ? [
                    'id' => $this->contact->id,
                    'reference' => $this->contact->reference,
                    'full_name' => $this->contact->full_name,
                    'email' => $this->contact->email,
                ] : null;
            }),
            
            'lead' => $this->whenLoaded('lead', function () {
                return $this->lead ? [
                    'id' => $this->lead->id,
                    'reference' => $this->lead->reference,
                    'name' => $this->lead->name ?? $this->lead->title,
                ] : null;
            }),
            
            'opportunity' => $this->whenLoaded('opportunity', function () {
                return $this->opportunity ? [
                    'id' => $this->opportunity->id,
                    'reference' => $this->opportunity->reference,
                    'title' => $this->opportunity->title,
                    'stage' => $this->opportunity->stage?->value,
                ] : null;
            }),
            
            'request' => $this->whenLoaded('request', function () {
                return $this->request ? [
                    'id' => $this->request->id,
                    'reference' => $this->request->reference,
                    'title' => $this->request->title,
                    'status' => $this->request->status?->value,
                ] : null;
            }),
            
            'assignee' => $this->whenLoaded('assignee', function () {
                return $this->assignee ? [
                    'employee' => [
                        'id' => $this->assignee->id,
                        'employee_code' => $this->assignee->employee_code,
                    ],
                    'user' => $this->assignee->user ? [
                        'id' => $this->assignee->user->id,
                        'name' => $this->assignee->user->name,
                        'username' => $this->assignee->user->username,
                        'email' => $this->assignee->user->email,
                    ] : null,
                ] : null;
            }),
            
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'username' => $this->creator->username,
                    'email' => $this->creator->email,
                ] : null;
            }),
            
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

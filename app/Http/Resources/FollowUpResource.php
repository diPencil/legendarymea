<?php

namespace App\Http\Resources;

use App\Enums\FollowUpStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FollowUpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOverdue = $this->status === FollowUpStatus::PENDING && $this->follow_up_at && $this->follow_up_at < now();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'follow_up_at' => $this->follow_up_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'is_overdue' => $isOverdue,
            
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
            
            'task' => $this->whenLoaded('task', function () {
                return $this->task ? [
                    'id' => $this->task->id,
                    'reference' => $this->task->reference,
                    'title' => $this->task->title,
                    'status' => $this->task->status?->value,
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

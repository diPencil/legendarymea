<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'body' => $this->body,
            
            'company' => $this->whenLoaded('company', fn () => [
                'id' => $this->company->id,
                'reference' => $this->company->reference,
                'name' => $this->company->name,
            ]),
            
            'contact' => $this->whenLoaded('contact', fn () => [
                'id' => $this->contact->id,
                'reference' => $this->contact->reference,
                'name' => trim("{$this->contact->first_name} {$this->contact->last_name}"),
                'email' => $this->contact->email,
            ]),
            
            'lead' => $this->whenLoaded('lead', fn () => [
                'id' => $this->lead->id,
                'reference' => $this->lead->reference,
                'title' => $this->lead->person_name ?: $this->lead->company_name,
                'status' => $this->lead->status,
            ]),
            
            'opportunity' => $this->whenLoaded('opportunity', fn () => [
                'id' => $this->opportunity->id,
                'reference' => $this->opportunity->reference,
                'title' => $this->opportunity->name,
                'stage' => $this->opportunity->stage,
            ]),
            
            'request' => $this->whenLoaded('request', fn () => [
                'id' => $this->request->id,
                'reference' => $this->request->reference,
                'title' => $this->request->title,
                'status' => $this->request->status,
            ]),
            
            'task' => $this->whenLoaded('task', fn () => [
                'id' => $this->task->id,
                'reference' => $this->task->reference,
                'title' => $this->task->title,
                'status' => $this->task->status,
            ]),
            
            'follow_up' => $this->whenLoaded('followUp', fn () => [
                'id' => $this->followUp->id,
                'reference' => $this->followUp->reference,
                'title' => $this->followUp->title,
                'status' => $this->followUp->status,
                'follow_up_at' => $this->followUp->follow_up_at,
            ]),
            
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'username' => $this->creator->username,
                'email' => $this->creator->email,
            ]),
            
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

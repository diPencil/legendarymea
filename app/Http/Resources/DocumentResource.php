<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
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
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'username' => $this->creator->username,
                ];
            }),

            'company' => $this->whenLoaded('company', function () {
                return [
                    'id' => $this->company->id,
                    'name' => $this->company->name,
                ];
            }),
            'contact' => $this->whenLoaded('contact', function () {
                return [
                    'id' => $this->contact->id,
                    'first_name' => $this->contact->first_name,
                    'last_name' => $this->contact->last_name,
                ];
            }),
            'lead' => $this->whenLoaded('lead', function () {
                return [
                    'id' => $this->lead->id,
                    'reference' => $this->lead->reference,
                    'title' => $this->lead->title,
                ];
            }),
            'opportunity' => $this->whenLoaded('opportunity', function () {
                return [
                    'id' => $this->opportunity->id,
                    'reference' => $this->opportunity->reference,
                    'title' => $this->opportunity->title,
                ];
            }),
            'request' => $this->whenLoaded('request', function () {
                return [
                    'id' => $this->request->id,
                    'reference' => $this->request->reference,
                    'title' => $this->request->title,
                ];
            }),
            'task' => $this->whenLoaded('task', function () {
                return [
                    'id' => $this->task->id,
                    'reference' => $this->task->reference,
                    'title' => $this->task->title,
                ];
            }),
            'follow_up' => $this->whenLoaded('followUp', function () {
                return [
                    'id' => $this->followUp->id,
                    'reference' => $this->followUp->reference,
                    'title' => $this->followUp->title,
                ];
            }),
            'note' => $this->whenLoaded('note', function () {
                return [
                    'id' => $this->note->id,
                    'reference' => $this->note->reference,
                    'title' => $this->note->title,
                ];
            }),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActiveServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,

            'service_catalog' => $this->whenLoaded('serviceCatalog', fn() => $this->serviceCatalog ? [
                'id' => $this->serviceCatalog->id,
                'code' => $this->serviceCatalog->code,
                'name_en' => $this->serviceCatalog->name_en,
                'name_ar' => $this->serviceCatalog->name_ar,
                'category' => $this->serviceCatalog->category,
                'description_en' => $this->serviceCatalog->description_en,
                'description_ar' => $this->serviceCatalog->description_ar,
                'active' => $this->serviceCatalog->active,
                'show_in_contact' => $this->serviceCatalog->show_in_contact,
                'available_for_invoice' => $this->serviceCatalog->available_for_invoice,
                'available_for_active_service' => $this->serviceCatalog->available_for_active_service,
                'sort_order' => $this->serviceCatalog->sort_order,
            ] : null),
            
            'company' => $this->whenLoaded('company', fn() => [
                'id' => $this->company->id,
                'reference' => $this->company->reference,
                'name' => $this->company->name,
            ]),
            
            'contract' => $this->whenLoaded('contract', fn() => [
                'id' => $this->contract->id,
                'reference' => $this->contract->reference,
                'title' => $this->contract->title,
                'status' => $this->contract->status->value,
            ]),
            
            'client_onboarding' => $this->whenLoaded('clientOnboarding', fn() => $this->clientOnboarding ? [
                'id' => $this->clientOnboarding->id,
                'reference' => $this->clientOnboarding->reference,
                'status' => $this->clientOnboarding->status->value,
            ] : null),
            
            'assignee' => $this->whenLoaded('assignee', fn() => $this->assignee ? [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'username' => $this->assignee->username,
            ] : null),
            
            'creator' => $this->whenLoaded('creator', fn() => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'username' => $this->creator->username,
            ] : null),

            'start_date' => $this->start_date ? $this->start_date->format('Y-m-d') : null,
            'end_date' => $this->end_date ? $this->end_date->format('Y-m-d') : null,
            'notes' => $this->notes,

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

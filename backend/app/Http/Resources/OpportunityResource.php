<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityResource extends JsonResource
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
            'name' => $this->name,
            'stage' => $this->stage,
            'probability' => $this->probability,
            'estimated_value' => $this->estimated_value,
            'currency' => $this->currency,
            'expected_close_date' => $this->expected_close_date ? $this->expected_close_date->format('Y-m-d') : null,
            'lost_reason' => $this->lost_reason,
            'notes' => $this->notes,
            'closed_at' => $this->closed_at ? $this->closed_at->toIso8601String() : null,
            'service_interest' => $this->service_interest,
            
            'company' => $this->whenLoaded('company', function () {
                return [
                    'id' => $this->company->id,
                    'reference' => $this->company->reference,
                    'name' => $this->company->name,
                ];
            }),
            
            'primary_contact' => $this->whenLoaded('primaryContact', function () {
                return [
                    'id' => $this->primaryContact->id,
                    'reference' => $this->primaryContact->reference,
                    'first_name' => $this->primaryContact->first_name,
                    'last_name' => $this->primaryContact->last_name,
                ];
            }),

            'owner' => $this->whenLoaded('owner', function () {
                return [
                    'id' => $this->owner->id,
                    'employee_code' => $this->owner->employee_code,
                    'user' => $this->owner->user ? [
                        'id' => $this->owner->user->id,
                        'name' => $this->owner->user->name,
                        'username' => $this->owner->user->username,
                        'email' => $this->owner->user->email,
                    ] : null,
                ];
            }),

            'source_lead' => $this->whenLoaded('sourceLead', function () {
                return [
                    'id' => $this->sourceLead->id,
                    'reference' => $this->sourceLead->reference,
                    'person_name' => $this->sourceLead->person_name,
                    'company_name' => $this->sourceLead->company_name,
                ];
            }),

            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}

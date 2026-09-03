<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
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
            'company_id' => $this->company_id,
            'contact_id' => $this->contact_id,
            'person_name' => $this->person_name,
            'company_name' => $this->company_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'country_code' => $this->country_code,
            'source' => $this->source,
            'service_interest' => $this->service_interest,
            'status' => $this->status,
            'priority' => $this->priority,
            'assigned_to' => $this->assigned_to,
            'estimated_value' => $this->estimated_value,
            'currency' => $this->currency,
            'next_follow_up_at' => $this->next_follow_up_at,
            'notes' => $this->notes,
            'converted_at' => $this->converted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'company' => $this->whenLoaded('company', function () {
                return [
                    'id' => $this->company->id,
                    'name' => $this->company->name,
                ];
            }),
            'contact' => $this->whenLoaded('contact', function () {
                $fullName = trim($this->contact->first_name . ' ' . $this->contact->last_name);

                return [
                    'id' => $this->contact->id,
                    'reference' => $this->contact->reference,
                    'first_name' => $this->contact->first_name,
                    'last_name' => $this->contact->last_name,
                    'full_name' => $fullName,
                ];
            }),
            'assigned_employee' => $this->whenLoaded('assignedTo', function () {
                return [
                    'id' => $this->assignedTo->id,
                    'employee_code' => $this->assignedTo->employee_code,
                    'user' => $this->assignedTo->user ? [
                        'id' => $this->assignedTo->user->id,
                        'name' => $this->assignedTo->user->name,
                        'username' => $this->assignedTo->user->username,
                        'email' => $this->assignedTo->user->email,
                    ] : null,
                ];
            }),
        ];
    }
}

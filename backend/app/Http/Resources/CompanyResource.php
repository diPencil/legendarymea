<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
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
            'legal_name' => $this->legal_name,
            'business_type' => $this->business_type,
            'status' => $this->status,
            'country_code' => $this->country_code,
            'city' => $this->city,
            'website' => $this->website,
            'email' => $this->email,
            'phone' => $this->phone,
            'tax_number' => $this->tax_number,
            'registration_number' => $this->registration_number,
            'source' => $this->source,
            'notes' => $this->notes,
            'relationships' => $this->whenLoaded('companyRelationships', function () {
                return $this->companyRelationships->pluck('type');
            }),
            'account_manager' => $this->whenLoaded('accountManager', function () {
                return [
                    'id' => $this->accountManager->id,
                    'name' => $this->accountManager->user?->name,
                    'email' => $this->accountManager->user?->email,
                ];
            }),
            'contacts_count' => $this->whenCounted('contacts'),
            'primary_contact' => new ContactResource($this->whenLoaded('primaryContact')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

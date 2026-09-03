<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
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
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => trim($this->first_name . ' ' . $this->last_name),
            'job_title' => $this->job_title,
            'department' => $this->department,
            'email' => $this->email,
            'phone' => $this->phone,
            'country_code' => $this->country_code,
            'is_primary' => $this->is_primary,
            'status' => $this->status,
            'preferred_locale' => $this->preferred_locale,
            'notes' => $this->notes,
            'company' => new CompanyResource($this->whenLoaded('company')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

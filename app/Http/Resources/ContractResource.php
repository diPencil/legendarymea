<?php

namespace App\Http\Resources;

use App\Services\LegendaryContractTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'reference'      => $this->reference,
            'title'          => $this->title,
            'status'         => $this->status,
            'start_date'     => $this->start_date?->format('Y-m-d'),
            'end_date'       => $this->end_date?->format('Y-m-d'),
            'signed_at'      => $this->signed_at?->toIso8601String(),
            'contract_value' => $this->contract_value,
            'currency'       => $this->currency,
            'terms'          => $this->terms,
            'notes'          => $this->notes,
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
            'contract_content' => LegendaryContractTemplate::normalize($this->contract_content),
            'additional_terms_en' => $this->additional_terms_en,
            'additional_terms_ar' => $this->additional_terms_ar,
            'scope_of_work_en' => $this->scope_of_work_en,
            'scope_of_work_ar' => $this->scope_of_work_ar,
            'payment_terms_en' => $this->payment_terms_en,
            'payment_terms_ar' => $this->payment_terms_ar,

            'company' => $this->whenLoaded('company', function () {
                return [
                    'id'        => $this->company->id,
                    'reference' => $this->company->reference,
                    'name'      => $this->company->name,
                    'legal_name' => $this->company->legal_name,
                    'email'      => $this->company->email,
                    'website'    => $this->company->website,
                ];
            }),

            'contact' => $this->whenLoaded('contact', function () {
                return [
                    'id'   => $this->contact->id,
                    'name' => $this->contact->first_name . ' ' . $this->contact->last_name,
                ];
            }),

            'quotation' => $this->whenLoaded('quotation', function () {
                return [
                    'id'           => $this->quotation->id,
                    'reference'    => $this->quotation->reference,
                    'status'       => $this->quotation->status,
                    'total_amount' => $this->quotation->total_amount,
                    'currency'     => $this->quotation->currency,
                ];
            }),

            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id'       => $this->creator->id,
                    'name'     => $this->creator->name,
                    'username' => $this->creator->username,
                ];
            }),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currency = $this->quotation?->currency ?? 'AED';

        return [
            'id'          => $this->id,
            'description' => $this->description,
            'quantity'    => $this->quantity,
            'unit_price'  => Money::normalize($this->unit_price, $currency),
            'line_total'  => Money::normalize($this->line_total, $currency),
            'sort_order'  => $this->sort_order,
        ];
    }
}

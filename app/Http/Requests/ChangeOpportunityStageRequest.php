<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\OpportunityStage;

class ChangeOpportunityStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', 'string', Rule::enum(OpportunityStage::class)],
            'lost_reason' => ['nullable', 'string', 'required_if:stage,' . OpportunityStage::LOST->value],
        ];
    }
}

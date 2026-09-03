<?php

namespace App\Http\Requests;

use App\Enums\SupplierType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_suppliers');
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::in(SupplierType::values())],
            'linked_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'linked_company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'mobile' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}

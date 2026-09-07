<?php

namespace App\Http\Requests;

use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateActiveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && PermissionAccess::can($user, 'update_active_services', 'manage_active_services');
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'service_catalog_id' => [
                'sometimes',
                'required',
                Rule::exists('service_catalogs', 'id')
                    ->where('active', true)
                    ->where('available_for_active_service', true),
            ],
            'description' => ['nullable', 'string'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'system_access' => ['required', 'string', 'in:none,create,link'],
            'user_id' => ['nullable', 'required_if:system_access,link', 'exists:users,id'],
            'username' => ['nullable', 'required_if:system_access,create', 'string', 'max:40', 'regex:/^[a-zA-Z0-9.\-_]+$/', 'unique:users,username'],
            'email' => ['nullable', 'required_if:system_access,create', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'required_if:system_access,create', 'string', 'min:8'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string'],
            
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'country_code' => ['nullable', 'string', 'max:10'],
            'status' => ['nullable', 'string', 'in:active,inactive,on_leave'],
            'is_sales_eligible' => ['sometimes', 'boolean'],
            'hire_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'exists:employees,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

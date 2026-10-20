<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupplierStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        // 1. Client portal users must never access supplier financial statements
        if (PermissionAccess::hasRole($user, 'client')) {
            return false;
        }

        // 2. Staff authorization: must have supplier or finance report permissions
        return PermissionAccess::can(
            $user,
            'view_suppliers',
            'manage_suppliers',
            'view_finance_reports',
            'manage_finance_reports'
        );
    }

    public function rules(): array
    {
        return [
            'currency' => ['nullable', 'string', 'size:3'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'type' => ['nullable', 'string', Rule::in(['all', 'funding', 'deposits', 'usage', 'invoice_usage', 'adjustments', 'reversals'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'all' => ['nullable', 'boolean'],
            'locale' => ['nullable', 'string', Rule::in(['en', 'ar'])],
        ];
    }
}

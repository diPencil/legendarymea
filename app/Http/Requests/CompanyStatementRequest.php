<?php

namespace App\Http\Requests;

use App\Models\Company;
use App\Support\PermissionAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompanyStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        $company = $this->route('company');

        // 1. If client user, check tenant isolation to own company
        if (PermissionAccess::hasRole($user, 'client')) {
            return $company instanceof Company && (int) $user->company_id === (int) $company->id;
        }

        // 2. Staff permission check
        return PermissionAccess::can(
            $user,
            'view_finance_reports',
            'manage_finance_reports',
            'view_invoices',
            'manage_invoices',
            'view_payments',
            'manage_payments'
        );
    }

    public function rules(): array
    {
        return [
            'currency' => ['nullable', 'string', 'size:3'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'type' => ['nullable', 'string', Rule::in(['all', 'invoices', 'payments', 'allocations', 'reversals'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'all' => ['nullable', 'boolean'],
            'locale' => ['nullable', 'string', Rule::in(['en', 'ar'])],
        ];
    }
}

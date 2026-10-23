<?php

namespace App\Services;

use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceCustomerEligibilityService
{
    private const INTERNAL_ROLES = ['super_admin', 'admin', 'manager', 'employee'];

    public function companies(): Builder
    {
        return Company::query()
            ->where('status', 'active')
            ->whereHas('companyRelationships', fn (Builder $query) => $query->where('type', 'client'));
    }

    public function users(): Builder
    {
        return User::query()
            ->with('company:id,name')
            ->whereIn('status', [UserStatus::ACTIVE->value, UserStatus::INVITED->value])
            ->whereNull('portal_disabled_at')
            ->whereDoesntHave('employee')
            ->whereHas('roles', fn (Builder $query) => $query->whereRaw('LOWER(name) = ?', ['client']))
            ->whereDoesntHave('roles', fn (Builder $query) => $query
                ->whereIn(DB::raw('LOWER(name)'), self::INTERNAL_ROLES));
    }

    public function assertCompanyEligible(int $companyId): void
    {
        if (! $this->companies()->whereKey($companyId)->exists()) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company must be an active CRM client company.'],
            ]);
        }
    }

    public function assertUserEligible(int $userId): void
    {
        if (! $this->users()->whereKey($userId)->exists()) {
            throw ValidationException::withMessages([
                'customer_user_id' => ['The selected user is not an eligible individual client customer.'],
            ]);
        }
    }
}

<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Enums\SupplierStatus;
use App\Enums\SupplierType;
use App\Models\Company;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateSupplierService
{
    public function execute(Supplier $supplier, array $data, int $userId): Supplier
    {
        return DB::transaction(function () use ($supplier, $data, $userId) {
            $type = $data['type'] ?? $supplier->type->value;
            $linkedUserId = array_key_exists('linked_user_id', $data) ? $data['linked_user_id'] : $supplier->linked_user_id;
            $linkedCompanyId = array_key_exists('linked_company_id', $data) ? $data['linked_company_id'] : $supplier->linked_company_id;

            $linkedUser = $linkedUserId ? User::findOrFail($linkedUserId) : null;
            $linkedCompany = $linkedCompanyId ? Company::findOrFail($linkedCompanyId) : null;

            if ($type === SupplierType::USER->value && (!$linkedUser || $linkedCompany)) {
                throw ValidationException::withMessages(['linked_user_id' => ['User suppliers require exactly one linked user.']]);
            }

            if ($type === SupplierType::COMPANY->value && (!$linkedCompany || $linkedUser)) {
                throw ValidationException::withMessages(['linked_company_id' => ['Company suppliers require exactly one linked company.']]);
            }

            $duplicateQuery = Supplier::query()
                ->whereKeyNot($supplier->id)
                ->where('status', SupplierStatus::ACTIVE);

            if ($type === SupplierType::USER->value && $linkedUserId && (clone $duplicateQuery)->where('type', $type)->where('linked_user_id', $linkedUserId)->exists()) {
                throw ValidationException::withMessages(['linked_user_id' => ['This user already has an active supplier profile.']]);
            }

            if ($type === SupplierType::COMPANY->value && $linkedCompanyId && (clone $duplicateQuery)->where('type', $type)->where('linked_company_id', $linkedCompanyId)->exists()) {
                throw ValidationException::withMessages(['linked_company_id' => ['This company already has an active supplier profile.']]);
            }

            $supplier->update([
                'type' => $type,
                'linked_user_id' => $type === SupplierType::USER->value ? $linkedUserId : null,
                'linked_company_id' => $type === SupplierType::COMPANY->value ? $linkedCompanyId : null,
                'name' => $data['name'] ?? $supplier->name,
                'address' => array_key_exists('address', $data) ? $data['address'] : $supplier->address,
                'mobile' => array_key_exists('mobile', $data) ? $data['mobile'] : $supplier->mobile,
                'email' => array_key_exists('email', $data) ? $data['email'] : $supplier->email,
                'status' => $data['status'] ?? $supplier->status->value,
                'updated_by' => $userId,
            ]);

            SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Supplier',
            entity: $supplier,
            oldValues: [],
            newValues: ['reference' => $supplier->reference],
            metadata: []
        );

            return $supplier->fresh(['linkedUser', 'linkedCompany', 'balanceAccounts.ledgerEntries']);
        });
    }
}

<?php

namespace App\Services;

use App\Enums\SupplierStatus;
use App\Enums\SupplierType;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateSupplierService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
    ) {}

    public function execute(array $data, int $userId): Supplier
    {
        return DB::transaction(function () use ($data, $userId) {
            [$type, $linkedUser, $linkedCompany] = $this->resolveLinkedEntity($data);
            $profile = $this->buildProfile($data, $linkedUser, $linkedCompany);
            $reference = $this->referenceGenerator->generate(
                'LM-SUP-' . $this->buildReferenceSegment($profile['name']) . '-',
                'suppliers',
                'reference',
                6
            );

            $this->guardDuplicateActiveLink($type, $linkedUser?->id, $linkedCompany?->id);

            $supplier = Supplier::create([
                'reference' => $reference,
                'type' => $type,
                'linked_user_id' => $linkedUser?->id,
                'linked_company_id' => $linkedCompany?->id,
                'name' => $profile['name'],
                'address' => $profile['address'],
                'mobile' => $profile['mobile'],
                'email' => $profile['email'],
                'status' => $data['status'] ?? SupplierStatus::ACTIVE->value,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'supplier.created',
                'subject_type' => Supplier::class,
                'subject_id' => $supplier->id,
                'new_values' => ['reference' => $supplier->reference, 'type' => $supplier->type->value],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            return $supplier->load(['linkedUser', 'linkedCompany', 'balanceAccounts.ledgerEntries']);
        });
    }

    public function buildReferenceSegment(string $name): string
    {
        $clean = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $name) ?? $name;
        $parts = preg_split('/\s+/u', trim($clean), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($parts) > 1) {
            $segment = collect($parts)
                ->map(fn (string $part) => Str::upper(Str::substr(Str::ascii($part), 0, 1)))
                ->implode('');
        } else {
            $segment = Str::upper(Str::substr(Str::ascii($parts[0] ?? $clean), 0, 3));
        }

        $segment = preg_replace('/[^A-Z0-9]/', '', $segment) ?: 'SUP';

        return Str::padRight(Str::substr($segment, 0, 6), 2, 'X');
    }

    private function resolveLinkedEntity(array $data): array
    {
        $type = $data['type'] ?? null;
        $linkedUser = !empty($data['linked_user_id']) ? User::findOrFail($data['linked_user_id']) : null;
        $linkedCompany = !empty($data['linked_company_id']) ? Company::findOrFail($data['linked_company_id']) : null;

        if ($type === SupplierType::USER->value && (!$linkedUser || $linkedCompany)) {
            throw ValidationException::withMessages([
                'linked_user_id' => ['User suppliers require exactly one linked user.'],
            ]);
        }

        if ($type === SupplierType::COMPANY->value && (!$linkedCompany || $linkedUser)) {
            throw ValidationException::withMessages([
                'linked_company_id' => ['Company suppliers require exactly one linked company.'],
            ]);
        }

        return [$type, $linkedUser, $linkedCompany];
    }

    private function buildProfile(array $data, ?User $linkedUser, ?Company $linkedCompany): array
    {
        $name = $data['name'] ?? $linkedCompany?->name ?? $linkedUser?->name;

        if (!$name) {
            throw ValidationException::withMessages(['name' => ['Supplier name is required.']]);
        }

        return [
            'name' => $name,
            'address' => $data['address'] ?? null,
            'mobile' => $data['mobile'] ?? $linkedCompany?->phone ?? null,
            'email' => $data['email'] ?? $linkedCompany?->email ?? $linkedUser?->email,
        ];
    }

    private function guardDuplicateActiveLink(string $type, ?int $linkedUserId, ?int $linkedCompanyId): void
    {
        $query = Supplier::query()->where('status', SupplierStatus::ACTIVE);

        if ($type === SupplierType::USER->value && $linkedUserId) {
            $exists = (clone $query)->where('type', $type)->where('linked_user_id', $linkedUserId)->exists();
            if ($exists) {
                throw ValidationException::withMessages(['linked_user_id' => ['This user already has an active supplier profile.']]);
            }
        }

        if ($type === SupplierType::COMPANY->value && $linkedCompanyId) {
            $exists = (clone $query)->where('type', $type)->where('linked_company_id', $linkedCompanyId)->exists();
            if ($exists) {
                throw ValidationException::withMessages(['linked_company_id' => ['This company already has an active supplier profile.']]);
            }
        }
    }
}

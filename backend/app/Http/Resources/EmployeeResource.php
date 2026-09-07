<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $includeSensitive = $request->boolean('include_sensitive');
        $isDetailRequest = $request->route()?->getName() !== 'employees.index';
        $canManage = $request->user()?->can('update', $this->resource) ?? false;

        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'username' => $this->user->username,
                    'email' => $this->user->email,
                    'status' => $this->user->status?->value ?? $this->user->status,
                    'roles' => $this->user->getRoleNames()
                        ->map(fn (string $role) => strtolower($role))
                        ->values(),
                    'last_login_at' => $this->user->last_login_at,
                    'must_change_password' => (bool) $this->user->must_change_password,
                    'account_invite_status' => $this->user->account_invite_status,
                    'account_invited_at' => $this->user->account_invited_at,
                    'account_invite_failed_at' => $this->user->account_invite_failed_at,
                ];
            }),
            'job_title' => $this->job_title,
            'department' => $this->department,
            'phone' => $this->phone,
            'country_code' => $this->country_code,
            'personal_email' => $this->when($isDetailRequest, $this->personal_email),
            'bank_account_number_masked' => $this->when($isDetailRequest, $this->maskedBankAccount()),
            'bank_account_number' => $this->when($isDetailRequest && $canManage && $includeSensitive, $this->bank_account_number),
            'national_address' => $this->when($isDetailRequest && $canManage, $this->national_address),
            'identity_document' => $this->when($isDetailRequest && $this->identity_document_path, function () {
                return [
                    'original_name' => $this->identity_document_original_name,
                    'mime_type' => $this->identity_document_mime_type,
                    'size' => $this->identity_document_size,
                    'uploaded_at' => $this->identity_document_uploaded_at,
                    'uploaded_by' => $this->whenLoaded('identityDocumentUploader', function () {
                        return $this->identityDocumentUploader ? [
                            'id' => $this->identityDocumentUploader->id,
                            'name' => $this->identityDocumentUploader->name,
                        ] : null;
                    }),
                ];
            }),
            'documents' => EmployeeDocumentResource::collection($this->whenLoaded('documents')),
            'status' => $this->status,
            'is_sales_eligible' => (bool) $this->is_sales_eligible,
            'hire_date' => $this->hire_date ? $this->hire_date->format('Y-m-d') : null,
            'notes' => $this->notes,
            'manager' => $this->whenLoaded('manager', function () {
                return $this->manager ? [
                    'id' => $this->manager->id,
                    'employee_code' => $this->manager->employee_code,
                    'name' => $this->manager->user ? $this->manager->user->name : null,
                ] : null;
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function maskedBankAccount(): ?string
    {
        $value = preg_replace('/\s+/', '', (string) $this->bank_account_number);

        if ($value === '') {
            return null;
        }

        $visible = substr($value, -4);

        return str_repeat('*', max(strlen($value) - 4, 4)) . $visible;
    }
}

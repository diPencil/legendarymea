<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'status' => $this->status->value,
            'preferred_locale' => $this->preferred_locale,
            'timezone' => $this->timezone,
            'last_login_at' => $this->last_login_at,
            'company_id' => $this->company_id,
            'must_change_password' => (bool) $this->must_change_password,
            'account_invite_status' => $this->account_invite_status,
            'account_invited_at' => $this->account_invited_at,
            'account_invite_failed_at' => $this->account_invite_failed_at,
            'portal_invited_at' => $this->portal_invited_at,
            'portal_disabled_at' => $this->portal_disabled_at,
            'roles' => $this->whenLoaded('roles', function() {
                return $this->getRoleNames()
                    ->map(fn (string $role) => strtolower($role))
                    ->values();
            }),
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $this->whenLoaded('permissions', function() {
                return $this->permissions->pluck('name')->values();
            }),
            'role_permissions' => $this->whenLoaded('roles', function() {
                return $this->roles
                    ->flatMap(fn ($role) => $role->permissions->pluck('name'))
                    ->unique()
                    ->values();
            }),
            'employee' => $this->whenLoaded('employee'),
        ];
    }
}

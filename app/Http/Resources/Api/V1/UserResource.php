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
            'status' => $this->status->value,
            'preferred_locale' => $this->preferred_locale,
            'timezone' => $this->timezone,
            'last_login_at' => $this->last_login_at,
            'roles' => $this->whenLoaded('roles', function() {
                return $this->getRoleNames();
            }),
            'permissions' => $this->whenLoaded('permissions', function() {
                return $this->getAllPermissions()->pluck('name');
            }),
        ];
    }
}

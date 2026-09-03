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
        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'username' => $this->user->username,
                    'email' => $this->user->email,
                ];
            }),
            'job_title' => $this->job_title,
            'department' => $this->department,
            'phone' => $this->phone,
            'country_code' => $this->country_code,
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
}

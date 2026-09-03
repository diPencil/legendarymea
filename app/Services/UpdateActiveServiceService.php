<?php

namespace App\Services;

use App\Enums\ActiveServiceStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class UpdateActiveServiceService
{
    public function execute(ActiveService $service, array $data, User $actor): ActiveService
    {
        return DB::transaction(function () use ($service, $data, $actor) {
            if (in_array($service->status, [ActiveServiceStatus::ENDED, ActiveServiceStatus::CANCELLED])) {
                throw new InvalidArgumentException("Cannot edit a {$service->status->value} service.");
            }

            if (array_key_exists('start_date', $data) || array_key_exists('end_date', $data)) {
                $startDate = array_key_exists('start_date', $data) ? $data['start_date'] : $service->start_date?->format('Y-m-d');
                $endDate = array_key_exists('end_date', $data) ? $data['end_date'] : $service->end_date?->format('Y-m-d');

                if ($startDate && $endDate && $endDate < $startDate) {
                    throw new InvalidArgumentException("End date cannot be before start date.");
                }
            }

            $oldValues = $service->toArray();

            if (array_key_exists('title', $data)) {
                $service->title = $data['title'];
            }
            if (array_key_exists('service_catalog_id', $data)) {
                $service->service_catalog_id = $data['service_catalog_id'];
            }
            if (array_key_exists('description', $data)) {
                $service->description = $data['description'];
            }
            if (array_key_exists('assigned_to', $data)) {
                $service->assigned_to = $data['assigned_to'];
            }
            if (array_key_exists('start_date', $data)) {
                $service->start_date = $data['start_date'];
            }
            if (array_key_exists('end_date', $data)) {
                $service->end_date = $data['end_date'];
            }
            if (array_key_exists('notes', $data)) {
                $service->notes = $data['notes'];
            }

            if ($service->isDirty()) {
                $service->save();

                AuditLog::create([
                    'user_id' => $actor->id,
                    'action' => 'active_service.updated',
                    'subject_type' => ActiveService::class,
                    'subject_id' => $service->id,
                    'old_values' => $oldValues,
                    'new_values' => $service->toArray(),
                ]);

                // We don't always need a CRM activity for generic updates to avoid noise,
                // but the prompt says: "Write useful CRM Activity through Company/Contract context."
                // Since prompt didn't explicitly request 'updated' CRM activity, wait, prompt says:
                // "Audit: active_service.created ... active_service.updated"
                // "CRM Activity Conceptually: Active Service created, Service activated, suspended, resumed, ended, cancelled. Avoid duplicate noise."
                // So no CRM activity for generic update.
            }

            return $service;
        });
    }
}

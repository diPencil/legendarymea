<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SystemActivityService
{
    /**
     * Record a system activity and optionally dispatch notifications.
     */
    public static function record(
        ?User $actor,
        string $action, // e.g., 'created', 'updated', 'deleted', 'approved', 'viewed'
        string $module, // e.g., 'Company', 'Contract', 'Invoice'
        ?Model $entity = null,
        ?array $oldValues = [],
        ?array $newValues = [],
        string $titleEn = '',
        string $titleAr = '',
        string $descriptionEn = '',
        string $descriptionAr = '',
        array $metadata = [],
        bool $notify = true
    ): ?AuditLog {
        try {
            // 1. Redact sensitive fields
            $redactedOld = self::redactSensitiveData($oldValues);
            $redactedNew = self::redactSensitiveData($newValues);

            // 2. Diff for updates to avoid logging unchanged fields
            if ($action === 'updated' && !empty($redactedOld) && !empty($redactedNew)) {
                $changedOld = [];
                $changedNew = [];
                foreach ($redactedNew as $key => $value) {
                    if (!array_key_exists($key, $redactedOld) || $redactedOld[$key] !== $value) {
                        $changedNew[$key] = $value;
                        if (array_key_exists($key, $redactedOld)) {
                            $changedOld[$key] = $redactedOld[$key];
                        }
                    }
                }
                $redactedOld = $changedOld;
                $redactedNew = $changedNew;

                if (empty($redactedNew)) {
                    return null;
                }
            }

            // 3. Create AuditLog
            $moduleKey = Str::snake($module);
            $actionKey = str_contains($action, '.')
                ? strtolower($action)
                : $moduleKey . '.' . Str::snake($action);

            $auditLog = AuditLog::create([
                'user_id' => $actor?->id,
                'action' => $actionKey,
                'subject_type' => $entity ? get_class($entity) : null,
                'subject_id' => $entity?->getKey(),
                'old_values' => empty($redactedOld) ? null : $redactedOld,
                'new_values' => empty($redactedNew) ? null : $redactedNew,
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'title_en' => $titleEn ?: self::generateTitle($actor, $action, $module, $entity, 'en'),
                    'title_ar' => $titleAr ?: self::generateTitle($actor, $action, $module, $entity, 'ar'),
                    'description_en' => $descriptionEn,
                    'description_ar' => $descriptionAr,
                    'metadata' => $metadata,
                    'actor_name' => $actor ? trim($actor->first_name . ' ' . $actor->last_name) : 'System',
                    'module' => $module,
                    'action_type' => $action,
                    'entity_reference' => $entity->reference ?? ($entity->name ?? ($entity->title ?? null)),
                ],
            ]);

            // 4. Dispatch Notifications
            if ($notify && $action !== 'viewed') {
                self::dispatchNotifications($auditLog, $actor, $entity, $module, $action);
            }

            return $auditLog;
        } catch (\Exception $e) {
            Log::error('Failed to record SystemActivity: ' . $e->getMessage());
            return null;
        }
    }

    public static function recordView(?User $actor, string $module, ?Model $entity = null): void
    {
        if (!$actor) return;

        $entityId = $entity ? $entity->getKey() : 'all';
        $cacheKey = "view_audit_{$actor->id}_{$module}_{$entityId}";
        
        if (!Cache::has($cacheKey)) {
            self::record(
                actor: $actor,
                action: 'viewed',
                module: $module,
                entity: $entity,
                notify: false
            );
            Cache::put($cacheKey, true, now()->addMinutes(5));
        }
    }

    private static function dispatchNotifications(AuditLog $auditLog, ?User $actor, ?Model $entity, string $module, string $action): void
    {
        $recipients = collect();

        if ($entity) {
            if (isset($entity->assigned_to)) $recipients->push($entity->assigned_to);
            elseif (isset($entity->account_manager_id)) $recipients->push($entity->account_manager_id);
            elseif (isset($entity->sales_agent_id)) $recipients->push($entity->sales_agent_id);
            elseif (isset($entity->employee_id)) $recipients->push($entity->employee_id);
        }
        
        if ($actor) {
            $recipients = $recipients->reject(fn($id) => (int)$id === (int)$actor->id);
        }
        
        $recipients = $recipients->unique()->filter();
        
        if ($recipients->isNotEmpty()) {
            $users = User::whereIn('id', $recipients)->get();
            foreach ($users as $user) {
                $user->notify(new SystemNotification($auditLog));
            }
        }
    }

    private static function redactSensitiveData(?array $data): ?array
    {
        if ($data === null) return null;
        
        $sensitiveKeys = ['password', 'password_confirmation', 'token', 'secret', 'smtp_password', 'imap_password', 'api_key', 'app_key', 'db_password', 'access_token', 'refresh_token', 'webhook_secret', 'signing_secret'];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = self::redactSensitiveData($value);
            } elseif (in_array(strtolower((string)$key), $sensitiveKeys) || str_contains(strtolower((string)$key), 'password')) {
                $data[$key] = '********';
            }
        }
        return $data;
    }

    private static function generateTitle(?User $actor, string $action, string $module, ?Model $entity, string $lang): string
    {
        $actorName = $actor ? trim($actor->first_name . ' ' . $actor->last_name) : 'System';
        $entityRef = $entity->reference ?? ($entity->name ?? ($entity->title ?? ''));
        
        if ($lang === 'en') {
            return "{$actorName} {$action} {$module}" . ($entityRef ? " {$entityRef}" : "");
        }
        
        // Simple Arabic translation for basic actions
        $actionAr = match($action) {
            'created' => 'بإنشاء',
            'updated' => 'بتحديث',
            'deleted' => 'بحذف',
            'approved' => 'بالموافقة على',
            'rejected' => 'برفض',
            'cancelled' => 'بإلغاء',
            'viewed' => 'بعرض',
            'assigned' => 'بتعيين',
            'uploaded' => 'برفع',
            default => $action
        };
        
        $moduleAr = match(strtolower($module)) {
            'company' => 'الشركة',
            'contract' => 'العقد',
            'invoice' => 'الفاتورة',
            'quotation' => 'عرض السعر',
            'contact' => 'جهة الاتصال',
            'lead' => 'العميل المحتمل',
            'opportunity' => 'الفرصة',
            'task' => 'المهمة',
            'request' => 'الطلب',
            'user' => 'المستخدم',
            'media' => 'الملف',
            default => $module
        };
        
        return "قام {$actorName} {$actionAr} {$moduleAr}" . ($entityRef ? " {$entityRef}" : "");
    }
}

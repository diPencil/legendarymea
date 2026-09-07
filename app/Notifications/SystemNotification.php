<?php

namespace App\Notifications;

use App\Models\AuditLog;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SystemNotification extends Notification
{
    use Queueable;

    public function __construct(private AuditLog $auditLog)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $context = $this->auditLog->request_context ?? [];
        $module = (string) ($context['module'] ?? 'System');
        $entityRef = (string) ($context['entity_reference'] ?? '');
        $action = (string) ($context['action_type'] ?? 'updated');

        $isClient = false;
        try {
            if (method_exists($notifiable, 'hasRole') && $notifiable->hasRole('client')) {
                $isClient = true;
            }
        } catch (\Throwable) {}

        $prefix = $isClient ? '/portal' : '/dashboard';
        // For portal, use tab-based paths; for dashboard keep existing
        $actionPath = match(strtolower($module)) {
            'company' => $isClient ? "/portal" : "/dashboard/companies/{$this->auditLog->subject_id}",
            'contract' => $isClient ? "/portal" : "/dashboard/contracts/{$this->auditLog->subject_id}",
            'invoice' => $isClient ? "/portal" : "/dashboard/invoices/{$this->auditLog->subject_id}",
            'quotation' => $isClient ? "/portal" : "/dashboard/quotations/{$this->auditLog->subject_id}",
            'opportunity' => $isClient ? "/portal" : "/dashboard/opportunities/{$this->auditLog->subject_id}",
            'lead' => $isClient ? "/portal" : "/dashboard/leads/{$this->auditLog->subject_id}",
            'task' => $isClient ? "/portal" : "/dashboard/tasks/{$this->auditLog->subject_id}",
            'request' => $isClient ? "/portal" : "/dashboard/requests/{$this->auditLog->subject_id}",
            'contact' => $isClient ? "/portal" : "/dashboard/contacts/{$this->auditLog->subject_id}",
            'employee' => $isClient ? "/portal" : "/dashboard/employees/{$this->auditLog->subject_id}",
            'document' => $isClient ? "/portal" : "/dashboard/documents/{$this->auditLog->subject_id}",
            'active_service', 'service' => $isClient ? "/portal" : "/dashboard/active-services/{$this->auditLog->subject_id}",
            default => $isClient ? "/portal" : "/dashboard/notifications"
        };

        return [
            'audit_log_id' => $this->auditLog->id,
            'subject_id' => $this->auditLog->subject_id,
            'subject_type' => $this->auditLog->subject_type,
            'module' => $module,
            'action_type' => $action,
            'entity_reference' => $entityRef,
            'title' => [
                'en' => (string) ($context['title_en'] ?? 'New Activity'),
                'ar' => (string) ($context['title_ar'] ?? 'نشاط جديد'),
            ],
            'description' => [
                'en' => (string) ($context['description_en'] ?? ''),
                'ar' => (string) ($context['description_ar'] ?? ''),
            ],
            'actor_name' => (string) ($context['actor_name'] ?? 'System'),
            'action_path' => $actionPath,
            'icon' => $this->getIconForAction($action),
        ];
    }
    
    private function getIconForAction(string $action): string
    {
        return match(strtolower($action)) {
            'created' => 'PlusCircle',
            'updated' => 'Edit2',
            'deleted' => 'Trash2',
            'approved' => 'CheckCircle',
            'rejected' => 'XCircle',
            'assigned' => 'UserPlus',
            'uploaded' => 'UploadCloud',
            'cancelled' => 'Slash',
            default => 'Bell'
        };
    }
}

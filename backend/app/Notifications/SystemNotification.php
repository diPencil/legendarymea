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
        
        // Define paths based on module
        $actionPath = match(strtolower($module)) {
            'company' => "/dashboard/companies/{$this->auditLog->subject_id}",
            'contract' => "/dashboard/contracts/{$this->auditLog->subject_id}",
            'invoice' => "/dashboard/invoices/{$this->auditLog->subject_id}",
            'quotation' => "/dashboard/quotations/{$this->auditLog->subject_id}",
            'opportunity' => "/dashboard/opportunities/{$this->auditLog->subject_id}",
            'lead' => "/dashboard/leads/{$this->auditLog->subject_id}",
            'task' => "/dashboard/tasks/{$this->auditLog->subject_id}",
            'request' => "/dashboard/requests/{$this->auditLog->subject_id}",
            'contact' => "/dashboard/contacts/{$this->auditLog->subject_id}",
            'employee' => "/dashboard/employees/{$this->auditLog->subject_id}",
            default => "/dashboard/notifications" // Fallback to Activity page
        };

        return [
            'audit_log_id' => $this->auditLog->id,
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

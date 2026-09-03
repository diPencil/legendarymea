<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(private Task $task)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'key' => 'task.assigned',
            'task_id' => $this->task->id,
            'task_reference' => $this->task->reference,
            'title' => $this->task->title,
            'company_reference' => $this->task->company?->reference,
            'content' => [
                'en' => "Task {$this->task->reference} has been assigned to you.",
                'ar' => "تم تعيين المهمة {$this->task->reference} لك.",
            ],
            'action_path' => "/tasks/{$this->task->id}",
        ];
    }
}

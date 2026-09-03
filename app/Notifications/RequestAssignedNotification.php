<?php

namespace App\Notifications;

use App\Models\Request;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RequestAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(private Request $request)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'key' => 'request.assigned',
            'request_id' => $this->request->id,
            'request_reference' => $this->request->reference,
            'title' => $this->request->title,
            'company_reference' => $this->request->company?->reference,
            'content' => [
                'en' => "Request {$this->request->reference} has been assigned to you.",
                'ar' => "تم تعيين الطلب {$this->request->reference} لك.",
            ],
            'action_path' => "/requests/{$this->request->id}",
        ];
    }
}

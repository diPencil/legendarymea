<?php

namespace App\Notifications;

use App\Models\FollowUp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FollowUpAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public FollowUp $followUp
    ) {}

    public function via(object $notifiable): array
    {
        return ['database']; // Following current task pattern
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'follow_up_assigned',
            'follow_up_id' => $this->followUp->id,
            'reference' => $this->followUp->reference,
            'title' => $this->followUp->title,
            'follow_up_at' => $this->followUp->follow_up_at?->toIso8601String(),
            'message' => "You have been assigned to follow-up {$this->followUp->reference}",
        ];
    }
}

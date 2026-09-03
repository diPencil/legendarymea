<?php

namespace App\Notifications;

use App\Models\Approval;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ApprovalCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(private Approval $approval)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'key'                 => 'approval.cancelled',
            'approval_id'         => $this->approval->id,
            'approval_reference'  => $this->approval->reference,
            'quotation_id'        => $this->approval->quotation_id,
            'quotation_reference' => $this->approval->quotation?->reference,
            'status'              => $this->approval->status->value,
            'content'             => [
                'en' => "Approval request {$this->approval->reference} assigned to you has been withdrawn.",
                'ar' => "تم سحب طلب الموافقة {$this->approval->reference} المعين لك.",
            ],
            'action_path' => "/approvals/{$this->approval->id}",
        ];
    }
}

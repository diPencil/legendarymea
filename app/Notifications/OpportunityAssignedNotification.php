<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Opportunity;

class OpportunityAssignedNotification extends Notification
{
    use Queueable;

    protected Opportunity $opportunity;

    public function __construct(Opportunity $opportunity)
    {
        $this->opportunity = $opportunity;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'key' => 'opportunity.assigned',
            'opportunity_id' => $this->opportunity->id,
            'opportunity_reference' => $this->opportunity->reference,
            'company_reference' => $this->opportunity->company ? $this->opportunity->company->reference : null,
            'action_path' => "/opportunities/{$this->opportunity->id}"
        ];
    }
}

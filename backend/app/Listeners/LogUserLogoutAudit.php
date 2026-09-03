<?php

namespace App\Listeners;

use App\Events\UserLoggedOut;
use App\Models\AuditLog;

class LogUserLogoutAudit
{
    public function handle(UserLoggedOut $event): void
    {
        if ($event->user) {
            AuditLog::create([
                'user_id' => $event->user->id,
                'action' => 'logout',
                'subject_type' => get_class($event->user),
                'subject_id' => $event->user->id,
                'request_context' => $event->requestContext,
            ]);
        }
    }
}

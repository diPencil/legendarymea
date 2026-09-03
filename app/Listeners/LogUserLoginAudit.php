<?php

namespace App\Listeners;

use App\Events\UserLoggedIn;
use App\Models\AuditLog;

class LogUserLoginAudit
{
    public function handle(UserLoggedIn $event): void
    {
        AuditLog::create([
            'user_id' => $event->user->id,
            'action' => 'login',
            'subject_type' => get_class($event->user),
            'subject_id' => $event->user->id,
            'request_context' => $event->requestContext,
        ]);
    }
}

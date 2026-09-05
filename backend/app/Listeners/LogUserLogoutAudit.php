<?php

namespace App\Listeners;

use App\Services\SystemActivityService;

use App\Events\UserLoggedOut;

class LogUserLogoutAudit
{
    public function handle(UserLoggedOut $event): void
    {
        if ($event->user) {
            SystemActivityService::record(
            actor: auth()->user(),
            action: 'logout',
            module: 'System',
            entity: null,
            oldValues: [],
            newValues: [],
            metadata: []
        );
        }
    }
}

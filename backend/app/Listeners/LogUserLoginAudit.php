<?php

namespace App\Listeners;

use App\Services\SystemActivityService;

use App\Events\UserLoggedIn;

class LogUserLoginAudit
{
    public function handle(UserLoggedIn $event): void
    {
        SystemActivityService::record(
            actor: auth()->user(),
            action: 'login',
            module: 'System',
            entity: null,
            oldValues: [],
            newValues: [],
            metadata: []
        );
    }
}

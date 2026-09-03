<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;
use Illuminate\Http\Request;

class UserLoggedIn
{
    use Dispatchable, SerializesModels;

    public $user;
    public $requestContext;

    public function __construct(User $user, Request $request)
    {
        $this->user = $user;
        $this->requestContext = [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];
    }
}

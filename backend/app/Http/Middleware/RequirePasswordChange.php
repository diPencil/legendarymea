<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->must_change_password) {
            return $next($request);
        }

        $path = trim($request->path(), '/');
        $allowed = [
            'api/v1/auth/me',
            'api/v1/auth/logout',
            'api/v1/auth/change-password',
        ];

        if (in_array($path, $allowed, true) || str_starts_with($path, 'api/v1/portal/')) {
            return $next($request);
        }

        return response()->json([
            'message' => __('Password change is required before using the dashboard.'),
        ], 403);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('Accept-Language');
        
        if ($locale && in_array(strtolower(substr($locale, 0, 2)), ['en', 'ar'])) {
            App::setLocale(strtolower(substr($locale, 0, 2)));
        } else {
            App::setLocale('en');
        }

        return $next($request);
    }
}

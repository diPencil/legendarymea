<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Route;

class HealthController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $requiredRoutes = [
            'api/v1/auth/me',
            'api/v1/dashboard/overview',
            'api/v1/employees/managers',
            'api/v1/portal/overview',
            'api/v1/portal/company',
            'api/v1/portal/contracts',
            'api/v1/portal/quotations',
            'api/v1/portal/invoices',
            'api/v1/portal/payments',
            'api/v1/portal/services',
            'api/v1/portal/requests',
            'api/v1/portal/documents',
            'api/v1/portal/notifications',
        ];

        $availableRoutes = collect(Route::getRoutes())->map(fn ($route) => $route->uri())->all();
        $routeChecks = [];

        foreach ($requiredRoutes as $route) {
            $routeChecks[$route] = in_array($route, $availableRoutes, true);
        }

        return $this->successResponse([
            'status' => 'ok',
            'ready' => ! in_array(false, $routeChecks, true),
            'routes_cached' => app()->routesAreCached(),
            'required_routes' => $routeChecks,
            'storage' => [
                'public_linked' => is_link(public_path('storage')) || file_exists(public_path('storage')),
            ],
        ]);
    }
}

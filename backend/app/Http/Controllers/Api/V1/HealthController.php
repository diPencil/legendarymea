<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;

class HealthController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->successResponse([
            'status' => 'ok'
        ]);
    }
}

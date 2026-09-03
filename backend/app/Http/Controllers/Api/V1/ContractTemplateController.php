<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Services\LegendaryContractTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('create', Contract::class) || $request->user()?->can('viewAny', Contract::class),
            403
        );

        return response()->json([
            'data' => LegendaryContractTemplate::getDefaultTemplate(),
        ]);
    }
}

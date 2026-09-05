<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FinanceReportService;
use App\Support\PermissionAccess;
use Illuminate\Http\Request;

class FinanceReportController extends Controller
{
    public function overview(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        \App\Services\SystemActivityService::recordView($request->user(), 'FinanceReport', null);

        return response()->json($service->overview($request->all()));
    }

    public function cashFlow(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->cashFlow($request->all()));
    }

    public function salesAndProfit(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->salesAndProfit($request->all()));
    }

    public function suppliers(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->suppliers($request->all()));
    }

    public function salesTeam(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->salesTeam($request->all()));
    }

    public function receivables(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->receivables($request->all()));
    }

    public function serviceBreakdown(Request $request, FinanceReportService $service)
    {
        $this->authorize($request);

        return response()->json($service->serviceBreakdown($request->all()));
    }

    private function authorize(Request $request): void
    {
        abort_unless(
            PermissionAccess::can($request->user(), 'view_finance_reports', 'manage_finance_reports'),
            403
        );
    }
}

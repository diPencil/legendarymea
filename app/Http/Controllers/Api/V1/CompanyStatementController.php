<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CompanyStatementRequest;
use App\Models\Company;
use App\Services\CompanyStatementService;
use App\Services\SystemActivityService;
use Illuminate\Http\JsonResponse;

class CompanyStatementController extends Controller
{
    public function __construct(
        private CompanyStatementService $statementService,
    ) {}

    /**
     * Get the company account statement with full chronological running balances and reconciliation.
     */
    public function show(CompanyStatementRequest $request, Company $company): JsonResponse
    {
        $statement = $this->statementService->getStatement($company, $request->validated());

        SystemActivityService::recordView(
            actor: $request->user(),
            module: 'CompanyStatement',
            entity: $company,
        );

        return response()->json($statement);
    }

    /**
     * Get distinct statement currencies available for this company.
     */
    public function currencies(CompanyStatementRequest $request, Company $company): JsonResponse
    {
        $currencies = $this->statementService->getAvailableCurrencies($company);

        return response()->json([
            'company_id' => $company->id,
            'currencies' => $currencies,
        ]);
    }

    /**
     * Print-friendly HTML Statement of Account.
     */
    public function print(
        CompanyStatementRequest $request,
        Company $company,
        \App\Services\CompanyStatementPdfHtmlRenderer $renderer
    ): \Illuminate\Http\Response {
        $locale = $request->input('locale', app()->getLocale() ?: 'en');
        $html = $renderer->render($company, $request->validated(), true, $locale);

        SystemActivityService::record(
            actor: $request->user(),
            action: 'printed',
            module: 'CompanyStatement',
            entity: $company,
            metadata: ['company_reference' => $company->reference]
        );

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Download Statement of Account as PDF.
     */
    public function downloadPdf(
        CompanyStatementRequest $request,
        Company $company,
        \App\Services\CompanyStatementPdfGenerator $generator
    ): \Illuminate\Http\Response {
        $locale = $request->input('locale', app()->getLocale() ?: 'en');
        $file = $generator->generate($company, $request->validated(), $locale);

        SystemActivityService::record(
            actor: $request->user(),
            action: 'pdf_downloaded',
            module: 'CompanyStatement',
            entity: $company,
            metadata: ['filename' => $file->filename, 'company_reference' => $company->reference]
        );

        return response($file->contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $file->filename . '"',
            'Content-Length' => strlen($file->contents),
        ]);
    }

    /**
     * Download Statement of Account as Excel (.xlsx).
     */
    public function downloadExcel(
        CompanyStatementRequest $request,
        Company $company,
        \App\Services\CompanyStatementExcelGenerator $generator
    ): \Illuminate\Http\Response {
        $file = $generator->generate($company, $request->validated());

        SystemActivityService::record(
            actor: $request->user(),
            action: 'excel_downloaded',
            module: 'CompanyStatement',
            entity: $company,
            metadata: ['filename' => $file->filename, 'company_reference' => $company->reference]
        );

        return response($file->contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $file->filename . '"',
            'Content-Length' => strlen($file->contents),
        ]);
    }
}

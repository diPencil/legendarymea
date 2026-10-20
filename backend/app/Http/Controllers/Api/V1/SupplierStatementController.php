<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupplierStatementRequest;
use App\Models\Supplier;
use App\Services\SupplierStatementExcelGenerator;
use App\Services\SupplierStatementPdfGenerator;
use App\Services\SupplierStatementPdfHtmlRenderer;
use App\Services\SupplierStatementService;
use App\Services\SystemActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class SupplierStatementController extends Controller
{
    public function __construct(
        private SupplierStatementService $statementService,
    ) {}

    /**
     * Get the supplier account statement with full chronological running balances and reconciliation.
     */
    public function show(SupplierStatementRequest $request, Supplier $supplier): JsonResponse
    {
        $statement = $this->statementService->getStatement($supplier, $request->validated());

        SystemActivityService::recordView(
            actor: $request->user(),
            module: 'SupplierStatement',
            entity: $supplier,
        );

        return response()->json($statement);
    }

    /**
     * Get distinct statement currencies available for this supplier.
     */
    public function currencies(SupplierStatementRequest $request, Supplier $supplier): JsonResponse
    {
        $currencies = $this->statementService->getAvailableCurrencies($supplier);

        return response()->json([
            'supplier_id' => $supplier->id,
            'currencies' => $currencies,
        ]);
    }

    /**
     * Print-friendly HTML Statement of Account for Supplier.
     */
    public function print(
        SupplierStatementRequest $request,
        Supplier $supplier,
        SupplierStatementPdfHtmlRenderer $renderer
    ): Response {
        $locale = $request->input('locale', app()->getLocale() ?: 'en');
        $html = $renderer->render($supplier, $request->validated(), true, $locale);

        SystemActivityService::record(
            actor: $request->user(),
            action: 'printed',
            module: 'SupplierStatement',
            entity: $supplier,
            metadata: ['supplier_reference' => $supplier->reference]
        );

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Download Supplier Statement of Account as PDF.
     */
    public function downloadPdf(
        SupplierStatementRequest $request,
        Supplier $supplier,
        SupplierStatementPdfGenerator $generator
    ): Response {
        $locale = $request->input('locale', app()->getLocale() ?: 'en');
        $file = $generator->generate($supplier, $request->validated(), $locale);

        SystemActivityService::record(
            actor: $request->user(),
            action: 'pdf_downloaded',
            module: 'SupplierStatement',
            entity: $supplier,
            metadata: ['filename' => $file->filename, 'supplier_reference' => $supplier->reference]
        );

        return response($file->contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $file->filename . '"',
            'Content-Length' => strlen($file->contents),
        ]);
    }

    /**
     * Download Supplier Statement of Account as Excel (.xlsx).
     */
    public function downloadExcel(
        SupplierStatementRequest $request,
        Supplier $supplier,
        SupplierStatementExcelGenerator $generator
    ): Response {
        $file = $generator->generate($supplier, $request->validated());

        SystemActivityService::record(
            actor: $request->user(),
            action: 'excel_downloaded',
            module: 'SupplierStatement',
            entity: $supplier,
            metadata: ['filename' => $file->filename, 'supplier_reference' => $supplier->reference]
        );

        return response($file->contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $file->filename . '"',
            'Content-Length' => strlen($file->contents),
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Supplier;
use Carbon\Carbon;
use Mpdf\Mpdf;
use RuntimeException;

class SupplierStatementPdfGenerator
{
    public function __construct(
        private readonly SupplierStatementPdfHtmlRenderer $renderer
    ) {}

    public function generate(Supplier $supplier, array $filters, string $locale = 'en'): InvoicePdfFile
    {
        try {
            $tempDir = storage_path('app/mpdf-temp');
            if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
                throw new RuntimeException('Unable to create the mPDF temporary directory.');
            }
            if (! is_writable($tempDir)) {
                throw new RuntimeException('The mPDF temporary directory is not writable.');
            }

            $defaultConfig = (new \Mpdf\Config\ConfigVariables())->getDefaults();
            $fontDirs = $defaultConfig['fontDir'];
            $fontDirs[] = storage_path('fonts');

            $defaultFontConfig = (new \Mpdf\Config\FontVariables())->getDefaults();
            $fontData = $defaultFontConfig['fontdata'];
            $fontData['montserrat'] = ['R' => 'Montserrat-Regular.ttf', 'B' => 'Montserrat-Bold.ttf'];
            $fontData['montserratarabic'] = [
                'R' => 'MontserratArabic-Regular.ttf',
                'B' => 'MontserratArabic-Bold.ttf',
                'useOTL' => 0xFF,
                'useKashida' => 75,
            ];

            $currency = $filters['currency'] ?? 'AED';
            $startDate = $filters['start_date'] ?? Carbon::now('UTC')->startOfMonth()->toDateString();
            $endDate = $filters['end_date'] ?? Carbon::now('UTC')->toDateString();

            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'fontDir' => $fontDirs,
                'fontdata' => $fontData,
                'margin_left' => 9,
                'margin_right' => 9,
                'margin_top' => 9,
                'margin_bottom' => 12,
                'default_font' => 'montserrat',
                'tempDir' => $tempDir,
            ]);

            $mpdf->autoScriptToLang = true;
            $mpdf->autoLangToFont = true;
            $mpdf->SetTitle("Supplier Statement of Account - {$supplier->name}");
            $mpdf->SetAuthor('Legendary Management MEA');

            $html = $this->renderer->render($supplier, $filters, false, $locale);
            $mpdf->WriteHTML($html);

            $filename = "supplier-statement-{$supplier->reference}-{$currency}-{$startDate}-to-{$endDate}.pdf";

            return new InvoicePdfFile(
                $filename,
                $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN)
            );
        } catch (\Throwable $exception) {
            throw new RuntimeException('Supplier Statement PDF generation failed: ' . $exception->getMessage(), 0, $exception);
        }
    }
}

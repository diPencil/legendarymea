<?php

namespace App\Services;

use App\Models\Company;
use Carbon\Carbon;
use Mpdf\Mpdf;
use RuntimeException;

class CompanyStatementPdfGenerator
{
    public function __construct(
        private readonly CompanyStatementPdfHtmlRenderer $renderer
    ) {}

    public function generate(Company $company, array $filters, string $locale = 'en'): InvoicePdfFile
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
            $mpdf->SetTitle("Statement of Account - {$company->name}");
            $mpdf->SetAuthor('Legendary Management MEA');

            $html = $this->renderer->render($company, $filters, false, $locale);
            $mpdf->WriteHTML($html);

            $filename = "statement-{$company->reference}-{$currency}-{$startDate}-to-{$endDate}.pdf";

            return new InvoicePdfFile(
                $filename,
                $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN)
            );
        } catch (\Throwable $exception) {
            throw new RuntimeException('Company Statement PDF generation failed: ' . $exception->getMessage(), 0, $exception);
        }
    }
}

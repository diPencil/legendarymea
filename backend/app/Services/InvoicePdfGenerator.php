<?php

namespace App\Services;

use App\Models\Invoice;
use Mpdf\Mpdf;
use RuntimeException;

class InvoicePdfGenerator
{
    public function __construct(private readonly InvoicePdfHtmlRenderer $renderer) {}

    public function generate(Invoice $invoice): InvoicePdfFile
    {
        try {
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

            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'fontDir' => $fontDirs,
                'fontdata' => $fontData,
                'margin_left' => 12,
                'margin_right' => 12,
                'margin_top' => 11,
                'margin_bottom' => 12,
                'default_font' => 'montserrat',
            ]);
            $mpdf->autoScriptToLang = true;
            $mpdf->autoLangToFont = true;
            $mpdf->SetTitle($invoice->reference);
            $mpdf->SetAuthor('Legendary Management MEA');
            $mpdf->WriteHTML($this->renderer->render($invoice));

            return new InvoicePdfFile(
                $this->filename($invoice),
                $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN)
            );
        } catch (\Throwable $exception) {
            throw new RuntimeException('Invoice PDF generation failed: ' . $exception->getMessage(), 0, $exception);
        }
    }

    public function filename(Invoice $invoice): string
    {
        $reference = preg_replace('/[^A-Za-z0-9._-]+/', '-', $invoice->reference) ?: 'invoice';

        return trim($reference, '.-') . '.pdf';
    }
}

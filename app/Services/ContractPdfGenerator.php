<?php

namespace App\Services;

use App\Models\Contract;
use Mpdf\Mpdf;
use RuntimeException;

class ContractPdfGenerator
{
    public function __construct(private readonly ContractPdfHtmlRenderer $renderer) {}

    public function generate(Contract $contract): ContractPdfFile
    {
        $html = $this->renderer->render($contract);

        try {
            $defaultConfig = (new \Mpdf\Config\ConfigVariables())->getDefaults();
            $fontDirs = $defaultConfig['fontDir'];
            $fontDirs[] = storage_path('fonts');

            $defaultFontConfig = (new \Mpdf\Config\FontVariables())->getDefaults();
            $fontData = $defaultFontConfig['fontdata'];

            $fontData['montserrat'] = [
                'R' => 'Montserrat-Regular.ttf',
                'B' => 'Montserrat-Bold.ttf',
            ];

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
                'margin_left' => 14,
                'margin_right' => 14,
                'margin_top' => 10,
                'margin_bottom' => 9,
                'margin_header' => 0,
                'margin_footer' => 7,
                'default_font' => 'montserrat',
            ]);
            $mpdf->autoScriptToLang = false;
            $mpdf->autoLangToFont = false;
            $watermark = base_path('../frontend/public/contract.png');
            if (is_file($watermark)) {
                $mpdf->SetWatermarkImage($watermark, 0.06, [135, 135], [-45, 68]);
                $mpdf->showWatermarkImage = true;
            }

            $mpdf->WriteHTML($html);

            $pdfContent = $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
            return new ContractPdfFile($this->filename($contract), $pdfContent);
        } catch (\Exception $e) {
            throw new RuntimeException('Contract PDF generation failed: ' . $e->getMessage());
        }
    }

    public function filename(Contract $contract): string
    {
        $reference = preg_replace('/[^A-Za-z0-9._-]+/', '-', $contract->reference) ?: 'contract';

        return trim($reference, '.-') . '.pdf';
    }
}

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
            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'margin_left' => 14,
                'margin_right' => 14,
                'margin_top' => 10,
                'margin_bottom' => 9,
                'margin_header' => 0,
                'margin_footer' => 7,
                'default_font' => 'xbriyaz',
            ]);
            $mpdf->autoScriptToLang = true;
            $mpdf->autoLangToFont = true;

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

<?php

namespace App\Services;

use App\Models\Contract;

class ContractPdfHtmlRenderer
{
    public function render(Contract $contract): string
    {
        $contract->loadMissing(['company', 'contact']);
        $pages = $this->groupByPage(LegendaryContractTemplate::normalize($contract->contract_content));
        $logo = $this->assetDataUri(base_path('../frontend/public/legendary-management.png'));
        $watermark = $this->assetDataUri(base_path('../frontend/public/contract.png'));

        return '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>' . $this->e($contract->reference) . '</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #081d60; font-family: "xbriyaz", Arial, sans-serif; }
.page { position: relative; width: 210mm; min-height: 297mm; overflow: hidden; background: #fff; padding: 10mm 14mm 9mm; page-break-after: always; isolation: isolate; }
.page:last-child { page-break-after: auto; }
.watermark { position: absolute; top: 30%; left: 15%; width: 70%; height: 70%; background-image: url("' . $watermark . '"); background-position: center; background-repeat: no-repeat; opacity: 0.15; z-index: -1; }
.corner { position: absolute; top: -12mm; right: -20mm; width: 48mm; height: 48mm; background-image: url("' . $watermark . '"); background-position: bottom center; background-repeat: no-repeat; transform: scaleX(-1); z-index: 0; opacity: 0.8; }
.doc-header { width: 100%; border-bottom: 1px solid rgba(8, 29, 96, .12); padding-bottom: 4mm; }
.logo { width: 68mm; height: auto; display: block; }
.issuer { margin-top: 2mm; font-weight: 900; font-size: 12px; }
.mark { text-align: right; }
.mark span, .section-kicker { color: #a07f31; font-size: 11px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.mark h1 { margin: 0; color: #081d60; font-size: 24px; font-weight: 900; line-height: 1.1; }
.badge { display: inline-block; min-height: 26px; border-radius: 999px; background: #fbf0cf; color: #a07f31; padding: 5px 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
.contract-title { width: 100%; border-bottom: 1px solid rgba(8, 29, 96, .12); padding: 4mm 0 3mm; }
.contract-title strong { font-size: 13px; font-weight: 900; }
.parties { width: 100%; margin: 4mm 0 4mm; border-collapse: separate; border-spacing: 4mm 0; }
.party { width: 48%; border: 1px solid rgba(8, 29, 96, .1); border-radius: 2mm; background: #fbfaf7; padding: 4mm; vertical-align: top; }
.party span { color: #667085; font-size: 11px; font-weight: 800; display: block; margin-bottom: 2mm; }
.party strong { font-size: 13px; font-weight: 900; display: block; }
.party small { display: block; margin-top: 1mm; }
.terms-header { width: 100%; margin: 1mm 0 2mm; }
.terms-header-cell { width: 48%; }
.terms-header strong { display: block; background: #b69338; color: #fff; padding: 1.5mm 2.5mm; font-size: 17px; font-weight: 900; line-height: 1.1; }
.section-title { width: 100%; border-bottom: 1px solid rgba(160, 127, 49, .28); padding-bottom: 2mm; margin-bottom: 2mm; }
.section-title h2 { margin: 0; color: #a07f31; font-size: 14px; font-weight: 900; line-height: 1.3; }
.clause-table { width: 100%; border-bottom: 1px solid rgba(8, 29, 96, .08); margin-bottom: 1mm; }
.clause-cell { width: 48%; vertical-align: top; padding-bottom: 2mm; }
.clause p { margin: 0; color: #081d60; font-size: 10.4px; font-weight: 700; line-height: 1.48; white-space: pre-line; }
.dot { display: inline-block; width: 5px; height: 5px; border-radius: 5px; background: #a07f31; margin-right: 2.5mm; margin-left: 2.5mm; }
.banking-clause-table { border-bottom: 0; }
.banking p { font-size: 12.8px; line-height: 1.42; }
.signatures { border-top: 5px solid #172357; padding-top: 5mm; }
.signatures-table { width: 100%; background: #b69338; }
.signatures-cell { width: 50%; padding: 4mm 6mm; vertical-align: top; }
.signatures p { color: #fff; font-size: 15px; font-weight: 900; line-height: 1.8; white-space: pre-line; margin: 0; height: 34mm; }
.footer { position: absolute; right: 14mm; bottom: 7mm; left: 14mm; width: 100%; text-align: left; color: #172357; font-size: 13px; font-weight: 500; border-bottom: 1px solid #172357; padding-bottom: 2mm; }
.page-3 { padding-top: 9mm; }
.page-3 .section-title { padding-bottom: 1.5mm; margin-bottom: 1mm; }
.page-3 .section-title h2 { font-size: 12.8px; line-height: 1.2; }
.page-3 .clause-table { margin-bottom: 0.5mm; }
.page-3 .clause-cell { padding-bottom: 1mm; }
.page-3 .clause p { font-size: 8.35px; line-height: 1.28; }
</style>
</head>
<body>' . $this->renderPages($contract, $pages, $logo) . '</body>
</html>';
    }

    private function renderPages(Contract $contract, array $pages, string $logo): string
    {
        return collect($pages)->map(function (array $page) use ($contract, $logo) {
            return '<div class="page page-' . (int) $page['page'] . '">
<div class="watermark"></div>' . ((int) $page['page'] > 1 ? '<div class="corner"></div>' : '') .
$this->renderPageHeader($contract, $logo, (int) $page['page']) .
'<div class="sections">' . collect($page['sections'])->map(fn (array $section) => $this->renderSection($section))->implode('') . '</div>
<div class="footer">www.legendarymea.com</div>
</div>';
        })->implode('');
    }

    private function renderPageHeader(Contract $contract, string $logo, int $page): string
    {
        if ($page !== 1) {
            return '';
        }

        return '<table class="doc-header">
<tr>
<td width="50%" valign="top"><img class="logo" src="' . $logo . '" alt="Legendary Management MEA"><div class="issuer">Legendary Management MEA</div></td>
<td width="50%" valign="top" class="mark"><span>CONTRACT</span><h1 dir="ltr">' . $this->e($contract->reference) . '</h1><span class="badge">' . $this->e($contract->status->value) . '</span></td>
</tr>
</table>
<table class="contract-title">
<tr>
<td width="50%" valign="bottom"><span class="section-kicker">Contract Agreement</span></td>
<td width="50%" valign="bottom" align="right"><strong dir="ltr">' . $this->e($contract->reference) . '</strong></td>
</tr>
</table>
<table class="parties">
<tr>
<td class="party"><span>First Party</span><strong>Legendary Management MEA</strong></td>
<td class="party"><span>Second Party</span><strong>' . $this->e($contract->company->legal_name ?: $contract->company->name) . '</strong>' . ($contract->contact ? '<small>' . $this->e(trim($contract->contact->first_name . ' ' . $contract->contact->last_name)) . '</small>' : '') . '</td>
</tr>
</table>';
    }

    private function renderSection(array $section): string
    {
        $html = '';
        if (($section['kind'] ?? '') === 'terms' && ($section['key'] ?? '') === 'handling_mechanism') {
            $html .= '<table class="terms-header"><tr><td class="terms-header-cell"><strong dir="ltr">Terms of Contract</strong></td><td width="4%"></td><td class="terms-header-cell" align="right"><strong dir="rtl">شروط التعاقد</strong></td></tr></table>';
        }
        if (($section['key'] ?? '') === 'preamble') {
            $html .= '<table class="terms-header"><tr><td class="terms-header-cell"><strong dir="ltr">' . $this->e($section['title_en'] ?? '') . '</strong></td><td width="4%"></td><td class="terms-header-cell" align="right"><strong dir="rtl">' . $this->e($section['title_ar'] ?? '') . '</strong></td></tr></table>';
        }

        $classes = trim('section ' . (($section['kind'] ?? '') === 'banking' ? 'banking' : '') . ' ' . (($section['kind'] ?? '') === 'signatures' ? 'signatures' : ''));
        $html .= '<div class="' . $classes . '">';
        
        if (! in_array($section['kind'] ?? '', ['banking', 'acknowledgement', 'signatures'], true) && ($section['key'] ?? '') !== 'preamble') {
            $html .= '<table class="section-title"><tr><td width="48%" valign="top"><h2 dir="ltr">' . $this->e($section['title_en'] ?? '') . '</h2></td><td width="4%"></td><td width="48%" valign="top" align="right"><h2 dir="rtl">' . $this->e($section['title_ar'] ?? '') . '</h2></td></tr></table>';
        }

        if (($section['kind'] ?? '') === 'signatures') {
            $html .= '<table class="signatures-table"><tr>';
            foreach (($section['clauses'] ?? []) as $i => $clause) {
                if ($i > 1) break; // Limit to 2 for side-by-side
                $align = $i === 0 ? 'left' : 'right';
                $dir = $i === 0 ? 'ltr' : 'rtl';
                $html .= '<td class="signatures-cell" align="' . $align . '"><p dir="' . $dir . '">' . $this->e($clause['en'] ?? '') . "\n" . $this->e($clause['ar'] ?? '') . '</p></td>';
            }
            $html .= '</tr></table></div>';
            return $html;
        }

        $isBanking = ($section['kind'] ?? '') === 'banking';
        
        foreach (($section['clauses'] ?? []) as $clause) {
            $html .= '<table class="clause-table ' . ($isBanking ? 'banking-clause-table' : '') . '"><tr>';
            
            // English Column
            $html .= '<td class="clause-cell" align="left">';
            if (! $isBanking) {
                $html .= '<table><tr><td valign="top" width="10"><span class="dot"></span></td><td valign="top"><p dir="ltr">' . $this->e($clause['en'] ?? '') . '</p></td></tr></table>';
            } else {
                $html .= '<p dir="ltr">' . $this->e($clause['en'] ?? '') . '</p>';
            }
            $html .= '</td>';
            
            $html .= '<td width="4%"></td>';
            
            // Arabic Column
            $html .= '<td class="clause-cell" align="right">';
            if (! $isBanking) {
                $html .= '<table dir="rtl" align="right"><tr><td valign="top" align="right"><p dir="rtl">' . $this->e($clause['ar'] ?? '') . '</p></td><td valign="top" width="10" align="left"><span class="dot"></span></td></tr></table>';
            } else {
                $html .= '<p dir="rtl">' . $this->e($clause['ar'] ?? '') . '</p>';
            }
            $html .= '</td>';
            
            $html .= '</tr></table>';
        }

        return $html . '</div>';
    }

    private function groupByPage(array $sections): array
    {
        return collect($sections)
            ->groupBy(fn (array $section) => (int) ($section['page'] ?? 1))
            ->sortKeys()
            ->map(fn ($sections, $page) => ['page' => (int) $page, 'sections' => $sections->values()->all()])
            ->values()
            ->all();
    }

    private function assetDataUri(string $path, ?string $mime = null): string
    {
        if (! is_file($path)) {
            return '';
        }

        $mime ??= mime_content_type($path) ?: 'application/octet-stream';
        return 'data:' . $mime . ';base64,' . base64_encode((string) file_get_contents($path));
    }

    private function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

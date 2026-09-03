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
        $regularFont = $this->assetDataUri(base_path('../frontend/public/fonts/Montserrat-Arabic-Regular.woff2'), 'font/woff2');
        $semiBoldFont = $this->assetDataUri(base_path('../frontend/public/fonts/Montserrat-Arabic-SemiBold.woff2'), 'font/woff2');
        $boldFont = $this->assetDataUri(base_path('../frontend/public/fonts/Montserrat-Arabic-Bold.woff2'), 'font/woff2');

        return '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>' . $this->e($contract->reference) . '</title>
<style>
@page { size: A4 portrait; margin: 0; }
@font-face { font-family: "Montserrat Arabic"; font-weight: 400; src: url("' . $regularFont . '") format("woff2"); }
@font-face { font-family: "Montserrat Arabic"; font-weight: 700; src: url("' . $semiBoldFont . '") format("woff2"); }
@font-face { font-family: "Montserrat Arabic"; font-weight: 900; src: url("' . $boldFont . '") format("woff2"); }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; color: #081d60; font-family: "Montserrat Arabic", Arial, sans-serif; }
.page { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: #fff; padding: 10mm 14mm 9mm; page-break-after: always; isolation: isolate; }
.page:last-child { page-break-after: auto; }
.watermark { position: absolute; top: 50%; left: 0; width: 70%; height: 70%; transform: translate(-50%, -50%); background: url("' . $watermark . '") center / contain no-repeat; opacity: .15; z-index: -1; }
.corner { position: absolute; top: -12mm; right: -20mm; width: 48mm; height: 48mm; background: url("' . $watermark . '") bottom center / contain no-repeat; transform: scaleX(-1); z-index: 0; }
.doc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; border-bottom: 1px solid rgba(8, 29, 96, .12); padding-bottom: 4mm; }
.logo { width: 68mm; height: auto; display: block; }
.issuer { margin-top: 2mm; font-weight: 900; font-size: 12px; }
.mark { text-align: right; display: grid; gap: 4mm; }
.mark span, .section-kicker { color: #a07f31; font-size: 11px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.mark h1 { margin: 0; color: #081d60; font-size: 24px; font-weight: 900; line-height: 1.1; }
.badge { justify-self: end; display: inline-flex; align-items: center; min-height: 26px; border-radius: 999px; background: #fbf0cf; color: #a07f31; padding: 0 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
.contract-title { display: flex; align-items: end; justify-content: space-between; gap: 8mm; border-bottom: 1px solid rgba(8, 29, 96, .12); padding: 4mm 0 3mm; }
.contract-title strong { font-size: 13px; font-weight: 900; }
.parties { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; margin: 4mm 0 4mm; }
.party { display: grid; gap: 2mm; min-height: 18mm; border: 1px solid rgba(8, 29, 96, .1); border-radius: 2mm; background: #fbfaf7; padding: 4mm; }
.party span { color: #667085; font-size: 11px; font-weight: 800; }
.party strong { font-size: 13px; font-weight: 900; }
.sections { display: grid; gap: 4mm; }
.terms-header { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16mm; align-items: center; margin: 1mm 0 2mm; }
.terms-header strong { display: block; background: #b69338; color: #fff; padding: 1.5mm 2.5mm; font-size: 17px; font-weight: 900; line-height: 1.1; }
.terms-header strong[dir="rtl"] { text-align: right; }
.section { display: grid; gap: 2.5mm; break-inside: avoid; }
.section-title { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16mm; border-bottom: 1px solid rgba(160, 127, 49, .28); padding-bottom: 2mm; }
.section-title h2 { margin: 0; color: #a07f31; font-size: 14px; font-weight: 900; line-height: 1.3; }
.section-title h2[dir="rtl"] { text-align: right; letter-spacing: 0; }
.clause { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16mm; border-bottom: 1px solid rgba(8, 29, 96, .08); padding: 2.2mm 0; }
.clause:last-child { border-bottom: 0; }
.clause p { margin: 0; color: #081d60; font-size: 10.4px; font-weight: 700; line-height: 1.48; white-space: pre-line; }
.clause p[dir="ltr"] { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2.5mm; text-align: left; }
.clause p[dir="rtl"] { display: flex; flex-direction: row-reverse; align-items: flex-start; gap: 2.5mm; text-align: right; letter-spacing: 0; }
.dot { display: inline-block; flex: 0 0 auto; width: 5px; height: 5px; margin-top: 6px; border-radius: 999px; background: #a07f31; }
.banking .clause { align-items: start; border-bottom: 0; padding-top: 0; }
.banking p { font-size: 12.8px; line-height: 1.42; }
.banking .dot, .signatures .dot { display: none; }
.banking p::first-line { color: #a07f31; font-size: 16px; font-weight: 900; }
.signatures { border-top: 5px solid #172357; padding-top: 5mm; }
.signatures .clause { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16mm; border-bottom: 0; padding: 4mm 6mm; background: #b69338; }
.signatures p { display: block; min-height: 34mm; background: transparent; color: #fff; padding: 0; margin: 0; font-size: 15px; font-weight: 900; line-height: 1.8; white-space: pre-line; }
.signatures p + p { text-align: right; }
.footer { position: absolute; right: 14mm; bottom: 7mm; left: 14mm; display: flex; align-items: center; gap: 3mm; color: #172357; font-size: 13px; font-weight: 500; }
.footer i { height: 1px; flex: 1; background: #172357; }
.page-3 { padding-top: 9mm; }
.page-3 .section-title { padding-bottom: 1.5mm; }
.page-3 .section-title h2 { font-size: 12.8px; line-height: 1.2; }
.page-3 .clause { padding: 1.5mm 0; }
.page-3 .clause p { font-size: 8.35px; line-height: 1.28; }
.page-3 .dot { width: 4px; height: 4px; margin-top: 4px; }
</style>
</head>
<body>' . $this->renderPages($contract, $pages, $logo) . '</body>
</html>';
    }

    private function renderPages(Contract $contract, array $pages, string $logo): string
    {
        return collect($pages)->map(function (array $page) use ($contract, $logo) {
            return '<section class="page page-' . (int) $page['page'] . '">
<div class="watermark"></div>' . ((int) $page['page'] > 1 ? '<div class="corner"></div>' : '') .
$this->renderPageHeader($contract, $logo, (int) $page['page']) .
'<div class="sections">' . collect($page['sections'])->map(fn (array $section) => $this->renderSection($section))->implode('') . '</div>
<footer class="footer"><span>www.legendarymea.com</span><i></i></footer>
</section>';
        })->implode('');
    }

    private function renderPageHeader(Contract $contract, string $logo, int $page): string
    {
        if ($page !== 1) {
            return '';
        }

        return '<header class="doc-header">
<div><img class="logo" src="' . $logo . '" alt="Legendary Management MEA"><div class="issuer">Legendary Management MEA</div></div>
<div class="mark"><span>CONTRACT</span><h1 dir="ltr">' . $this->e($contract->reference) . '</h1><em class="badge">' . $this->e($contract->status->value) . '</em></div>
</header>
<div class="contract-title"><span class="section-kicker">Contract Agreement</span><strong dir="ltr">' . $this->e($contract->reference) . '</strong></div>
<div class="parties">
<div class="party"><span>First Party</span><strong>Legendary Management MEA</strong></div>
<div class="party"><span>Second Party</span><strong>' . $this->e($contract->company->legal_name ?: $contract->company->name) . '</strong>' . ($contract->contact ? '<small>' . $this->e(trim($contract->contact->first_name . ' ' . $contract->contact->last_name)) . '</small>' : '') . '</div>
</div>';
    }

    private function renderSection(array $section): string
    {
        $html = '';
        if (($section['kind'] ?? '') === 'terms' && ($section['key'] ?? '') === 'handling_mechanism') {
            $html .= '<div class="terms-header"><strong dir="ltr">Terms of Contract</strong><strong dir="rtl">شروط التعاقد</strong></div>';
        }
        if (($section['key'] ?? '') === 'preamble') {
            $html .= '<div class="terms-header"><strong dir="ltr">' . $this->e($section['title_en'] ?? '') . '</strong><strong dir="rtl">' . $this->e($section['title_ar'] ?? '') . '</strong></div>';
        }

        $classes = trim('section ' . (($section['kind'] ?? '') === 'banking' ? 'banking' : '') . ' ' . (($section['kind'] ?? '') === 'signatures' ? 'signatures' : ''));
        $html .= '<section class="' . $classes . '">';
        if (! in_array($section['kind'] ?? '', ['banking', 'acknowledgement', 'signatures'], true) && ($section['key'] ?? '') !== 'preamble') {
            $html .= '<div class="section-title"><h2 dir="ltr">' . $this->e($section['title_en'] ?? '') . '</h2><h2 dir="rtl">' . $this->e($section['title_ar'] ?? '') . '</h2></div>';
        }

        foreach (($section['clauses'] ?? []) as $clause) {
            $showDot = ! in_array($section['kind'] ?? '', ['banking', 'signatures'], true);
            $html .= '<div class="clause"><p dir="ltr">' . ($showDot ? '<span class="dot"></span>' : '') . '<span>' . $this->e($clause['en'] ?? '') . '</span></p><p dir="rtl">' . ($showDot ? '<span class="dot"></span>' : '') . '<span>' . $this->e($clause['ar'] ?? '') . '</span></p></div>';
        }

        return $html . '</section>';
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

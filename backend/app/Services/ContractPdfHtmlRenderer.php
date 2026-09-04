<?php

namespace App\Services;

use App\Models\Contract;

class ContractPdfHtmlRenderer
{
    public function render(Contract $contract): string
    {
        $contract->loadMissing(['company', 'contact']);
        $pages = $this->groupByPage(LegendaryContractTemplate::normalize($contract->contract_content));
        $logo = base_path('../frontend/public/legendary-management.png');

        return '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>' . $this->e($contract->reference) . '</title>
</head>
<body style="margin:0;padding:0;color:#081d60;font-family:xbriyaz,Arial,sans-serif;font-size:8px;">
' . $this->renderPages($contract, $pages, $logo) . '
</body>
</html>';
    }

    private function renderPages(Contract $contract, array $pages, string $logo): string
    {
        return collect($pages)->map(function (array $page) use ($contract, $logo) {
            $html = '';
            if ((int) $page['page'] > 1) {
                $html .= '<pagebreak />';
            }
            $html .= '<div class="pdf-page page-' . (int) $page['page'] . '">';
            $html .= $this->renderPageHeader($contract, $logo, (int) $page['page']);
            $html .= collect($page['sections'])->map(fn (array $section) => $this->renderSection($section))->implode('');
            $html .= '<div class="footer">www.legendarymea.com</div>';
            $html .= '</div>';
            return $html;
        })->implode('');
    }

    private function renderPageHeader(Contract $contract, string $logo, int $page): string
    {
        if ($page !== 1) {
            return '';
        }

        $logoHtml = $logo !== '' ? '<img class="logo" src="' . $logo . '" alt="Legendary Management MEA">' : '';

        return '<table width="100%" class="doc-header" style="table-layout:fixed;border-bottom:1px solid #e3dfd4;padding-bottom:8px;">
<tr>
<td width="50%" valign="top">' . $logoHtml . '<div style="margin-top:4px;font-weight:bold;font-size:9px;color:#081d60;">Legendary Management MEA</div></td>
<td width="50%" valign="top" align="right"><span style="color:#a07f31;font-size:8px;font-weight:bold;text-transform:uppercase;">CONTRACT</span><h1 dir="ltr" style="margin:0 0 6px;color:#081d60;font-size:20px;font-weight:bold;line-height:1.05;">' . $this->e($contract->reference) . '</h1><span style="display:inline-block;background:#fbf0cf;color:#a07f31;padding:4px 10px;font-size:8px;font-weight:bold;text-transform:uppercase;">' . $this->e($contract->status->value) . '</span></td>
</tr>
</table>
<table width="100%" class="contract-title" style="table-layout:fixed;border-bottom:1px solid #e3dfd4;padding:8px 0 7px;margin-bottom:10px;">
<tr>
<td width="50%" valign="bottom"><span style="color:#a07f31;font-size:8px;font-weight:bold;text-transform:uppercase;">Contract Agreement</span></td>
<td width="50%" valign="bottom" align="right"><strong dir="ltr" style="font-size:9px;color:#081d60;">' . $this->e($contract->reference) . '</strong></td>
</tr>
</table>
<table width="100%" class="parties" style="table-layout:fixed;margin:10px 0;">
<tr>
<td width="48%" class="party" style="border:1px solid #ded8c8;background:#fbfaf7;padding:9px;"><span style="color:#667085;font-size:7px;font-weight:bold;">First Party</span><br><strong style="font-size:9px;color:#081d60;">Legendary Management MEA</strong></td>
<td width="4%">&nbsp;</td>
<td width="48%" class="party" style="border:1px solid #ded8c8;background:#fbfaf7;padding:9px;"><span style="color:#667085;font-size:7px;font-weight:bold;">Second Party</span><br><strong style="font-size:9px;color:#081d60;">' . $this->e($contract->company->legal_name ?: $contract->company->name) . '</strong>' . ($contract->contact ? '<br><small>' . $this->e(trim($contract->contact->first_name . ' ' . $contract->contact->last_name)) . '</small>' : '') . '</td>
</tr>
</table>';
    }

    private function renderSection(array $section): string
    {
        $html = '';
        if (($section['kind'] ?? '') === 'terms' && ($section['key'] ?? '') === 'handling_mechanism') {
            $html .= '<table width="100%" style="table-layout:fixed;margin:4px 0 8px;"><tr><td width="48%"><strong dir="ltr" style="display:block;background:#b69338;color:#ffffff;padding:4px 8px;font-size:13px;">Terms of Contract</strong></td><td width="4%">&nbsp;</td><td width="48%" align="right"><strong dir="rtl" style="display:block;background:#b69338;color:#ffffff;padding:4px 8px;font-size:13px;">شروط التعاقد</strong></td></tr></table>';
        }
        if (($section['key'] ?? '') === 'preamble') {
            $html .= '<table width="100%" style="table-layout:fixed;margin:4px 0 8px;"><tr><td width="48%"><strong dir="ltr" style="display:block;background:#b69338;color:#ffffff;padding:4px 8px;font-size:13px;">' . $this->e($section['title_en'] ?? '') . '</strong></td><td width="4%">&nbsp;</td><td width="48%" align="right"><strong dir="rtl" style="display:block;background:#b69338;color:#ffffff;padding:4px 8px;font-size:13px;">' . $this->e($section['title_ar'] ?? '') . '</strong></td></tr></table>';
        }

        $classes = trim('section ' . (($section['kind'] ?? '') === 'banking' ? 'banking' : '') . ' ' . (($section['kind'] ?? '') === 'signatures' ? 'signatures' : ''));
        $html .= '<div class="' . $classes . '">';
        
        if (($section['key'] ?? '') !== 'preamble') {
            $html .= '<table width="100%" class="section-title" style="table-layout:fixed;border-bottom:1px solid #dfd4b7;margin:5px 0 6px;"><tr><td width="48%" valign="top"><h2 dir="ltr" style="margin:0;color:#a07f31;font-size:11px;font-weight:bold;">' . $this->title($section['title_en'] ?? '') . '</h2></td><td width="4%">&nbsp;</td><td width="48%" valign="top" align="right"><h2 dir="rtl" style="margin:0;color:#a07f31;font-size:11px;font-weight:bold;">' . $this->title($section['title_ar'] ?? '') . '</h2></td></tr></table>';
        }

        if (($section['kind'] ?? '') === 'signatures') {
            $html .= '<table width="100%" style="table-layout:fixed;background:#b69338;border-top:5px solid #172357;"><tr>';
            foreach (($section['clauses'] ?? []) as $i => $clause) {
                if ($i > 1) break; // Limit to 2 for side-by-side
                $align = $i === 0 ? 'left' : 'right';
                $dir = $i === 0 ? 'ltr' : 'rtl';
                $html .= '<td width="50%" align="' . $align . '" valign="top" style="padding:12px 18px;"><p dir="' . $dir . '" style="color:#ffffff;font-size:9px;font-weight:bold;line-height:1.5;margin:0;">' . $this->lines($clause['en'] ?? '') . '<br><br>' . $this->lines($clause['ar'] ?? '') . '</p></td>';
            }
            $html .= '</tr></table></div>';
            return $html;
        }

        $isBanking = ($section['kind'] ?? '') === 'banking';
        
        $html .= '<table width="100%" class="clause-table ' . ($isBanking ? 'banking-clause-table' : '') . '" style="table-layout: fixed; width: 100%;">';
        $html .= '<col style="width: 48%;"><col style="width: 4%;"><col style="width: 48%;">';
        foreach (($section['clauses'] ?? []) as $clause) {
            $html .= '<tr>';
            
            // English Column
            $html .= '<td class="clause-cell" align="left" valign="top" style="border:1px solid #ece6d8;padding:4px;">';
            if (! $isBanking) {
                $html .= '<p dir="ltr" style="margin:0;color:#081d60;font-size:7px;line-height:1.08;">' . $this->e($clause['en'] ?? '') . '</p>';
            } else {
                $html .= '<p dir="ltr" style="margin:0;color:#081d60;font-size:7px;line-height:1.08;">' . $this->e($clause['en'] ?? '') . '</p>';
            }
            $html .= '</td>';
            
            $html .= '<td>&nbsp;</td>';
            
            // Arabic Column
            $html .= '<td class="clause-cell" align="right" valign="top" style="border:1px solid #ece6d8;padding:4px;">';
            if (! $isBanking) {
                $html .= '<p dir="rtl" style="margin:0;color:#081d60;font-size:7px;line-height:1.08;">' . $this->e($clause['ar'] ?? '') . '</p>';
            } else {
                $html .= '<p dir="rtl" style="margin:0;color:#081d60;font-size:7px;line-height:1.08;">' . $this->e($clause['ar'] ?? '') . '</p>';
            }
            $html .= '</td>';
            
            $html .= '</tr>';
        }
        $html .= '</table>';

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


    private function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function lines(mixed $value): string
    {
        return nl2br($this->e($value), false);
    }

    private function title(mixed $value): string
    {
        return $this->lines(str_replace('\n', "\n", (string) $value));
    }
}

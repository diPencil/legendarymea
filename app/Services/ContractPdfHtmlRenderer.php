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
<body style="margin:0;padding:0;background:#ffffff;color:#081d60;font-family:xbriyaz,Arial,sans-serif;font-size:8.2px;">
' . $this->renderPages($contract, $pages, $logo) . '
</body>
</html>';
    }

    private function renderPages(Contract $contract, array $pages, string $logo): string
    {
        return collect($pages)->map(function (array $page) use ($contract, $logo) {
            $pageNumber = (int) $page['page'];
            $html = '';
            if ($pageNumber > 1) {
                $html .= '<pagebreak />';
            }
            $html .= '<div style="position:relative;padding:0;overflow:hidden;">';
            $html .= $this->renderPageHeader($contract, $logo, $pageNumber);
            $html .= collect($page['sections'])->map(fn (array $section) => $this->renderSection($section, $pageNumber))->implode('');
            $html .= '<table width="100%" style="table-layout:fixed;border-collapse:collapse;margin-top:4mm;"><tr><td width="18%" style="color:#172357;font-size:8px;font-weight:600;">www.legendarymea.com</td><td width="82%" style="border-bottom:1px solid #172357;font-size:0;line-height:0;">&nbsp;</td></tr></table>';
            $html .= '</div>';
            return $html;
        })->implode('');
    }

    private function renderPageHeader(Contract $contract, string $logo, int $page): string
    {
        if ($page !== 1) {
            return '';
        }

        $settings = $this->publicSettings();
        $general = $settings['general'] ?? [];
        $contact = $settings['contact'] ?? [];
        $issuerName = trim((string) ($general['company_display_name'] ?? '')) ?: trim((string) ($general['legal_name'] ?? '')) ?: 'Legendary Management MEA';
        $issuerAddress = trim((string) ($contact['address_en'] ?? '')) ?: 'Riyadh, Saudi Arabia';
        $issuerPhone = trim((string) ($contact['phone'] ?? '')) ?: trim((string) ($contact['whatsapp'] ?? '')) ?: '+966 53 314 4910';
        $issuerEmail = trim((string) ($contact['public_email'] ?? '')) ?: 'info@legendarymea.com';
        $logoHtml = $logo !== '' && is_file($logo) ? '<img src="' . $logo . '" alt="Legendary Management MEA" style="width:78mm;height:auto;border:0;margin:0 0 4mm 0;">' : '';

        return '<table width="100%" style="table-layout:fixed;border-collapse:collapse;border-bottom:1px solid #e3dfd4;margin:0 0 5mm 0;padding-bottom:4mm;">
<tr>
<td width="54%" valign="top" style="padding-bottom:4mm;">' . $logoHtml . '<div style="font-weight:900;font-size:9.5px;line-height:1.45;color:#081d60;">' . $this->e($issuerName) . '</div><div style="margin-top:1mm;color:#667085;font-size:7.6px;line-height:1.45;">' . $this->e($issuerAddress) . '<br><span dir="ltr">' . $this->e($issuerPhone) . '</span><br><span dir="ltr">' . $this->e($issuerEmail) . '</span></div></td>
<td width="46%" valign="top" align="right" style="padding-bottom:4mm;"><span style="color:#a07f31;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">CONTRACT</span><h1 dir="ltr" style="margin:2mm 0 4mm 0;color:#081d60;font-size:24px;font-weight:900;line-height:1;">' . $this->e($contract->reference) . '</h1>' . $this->statusBadge($contract->status->value) . '</td>
</tr>
</table>
<table width="100%" style="table-layout:fixed;border-collapse:collapse;border-bottom:1px solid #e3dfd4;margin:0 0 7mm 0;padding-bottom:3mm;">
<tr>
<td width="50%" valign="bottom"><span style="color:#a07f31;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">Contract Agreement</span></td>
<td width="50%" valign="bottom" align="right"><strong dir="ltr" style="font-size:9px;color:#081d60;font-weight:900;">' . $this->e($contract->reference) . '</strong></td>
</tr>
</table>
<table width="100%" style="table-layout:fixed;border-collapse:separate;margin:0 0 6mm 0;">
<tr>
<td width="48.5%" valign="top" style="border:1px solid #ded8c8;background:#fbfaf7;padding:5mm 4mm;border-radius:8px;"><span style="color:#667085;font-size:7.6px;font-weight:800;">First Party</span><br><strong style="display:block;margin-top:2mm;font-size:9.6px;line-height:1.35;color:#081d60;font-weight:900;">Legendary Management MEA</strong></td>
<td width="3%">&nbsp;</td>
<td width="48.5%" valign="top" style="border:1px solid #ded8c8;background:#fbfaf7;padding:5mm 4mm;border-radius:8px;"><span style="color:#667085;font-size:7.6px;font-weight:800;">Second Party</span><br><strong style="display:block;margin-top:2mm;font-size:9.6px;line-height:1.35;color:#081d60;font-weight:900;">' . $this->e($contract->company->legal_name ?: $contract->company->name) . '</strong>' . ($contract->contact ? '<br><small style="color:#667085;font-size:7.5px;">' . $this->e(trim($contract->contact->first_name . ' ' . $contract->contact->last_name)) . '</small>' : '') . '</td>
</tr>
</table>';
    }

    private function renderSection(array $section, int $pageNumber): string
    {
        $html = '';
        if (($section['kind'] ?? '') === 'terms' && ($section['key'] ?? '') === 'handling_mechanism') {
            $html .= $this->renderGoldBand('Terms of Contract', 'شروط التعاقد');
        }
        if (($section['key'] ?? '') === 'preamble') {
            $html .= $this->renderGoldBand((string) ($section['title_en'] ?? ''), (string) ($section['title_ar'] ?? ''));
        }

        $html .= '<div style="margin:0 0 ' . $this->sectionMargin($section) . 'mm 0;">';
        
        if (! in_array(($section['kind'] ?? ''), ['banking', 'acknowledgement', 'signatures'], true) && ($section['key'] ?? '') !== 'preamble') {
            $html .= $this->renderSectionTitle((string) ($section['title_en'] ?? ''), (string) ($section['title_ar'] ?? ''));
        }

        if (($section['kind'] ?? '') === 'signatures') {
            $html .= $this->renderSignatures($section);
            $html .= '</div>';
            return $html;
        }

        $isBanking = ($section['kind'] ?? '') === 'banking';
        $fontSize = $this->clauseFontSize($section, $pageNumber);
        $lineHeight = $this->clauseLineHeight($section, $pageNumber);
        
        $html .= '<table width="100%" style="table-layout:fixed;border-collapse:collapse;width:100%;">';
        foreach (($section['clauses'] ?? []) as $clause) {
            $cellPadding = $isBanking ? '1.2mm 0 2mm 0' : '2mm 0';
            $border = $isBanking ? '0' : 'border-bottom:1px solid #ece6d8;';
            $bullet = $isBanking ? '' : $this->bulletCell();
            
            $html .= '<tr>';
            $html .= '<td width="48.5%" valign="top" style="' . $border . 'padding:' . $cellPadding . ';">';
            $html .= '<table width="100%" style="table-layout:fixed;border-collapse:collapse;"><tr>' . $bullet . '<td valign="top"><p dir="ltr" style="margin:0;color:#081d60;font-size:' . $fontSize . 'px;font-weight:600;line-height:' . $lineHeight . ';white-space:pre-line;">' . $this->text($clause['en'] ?? '') . '</p></td></tr></table>';
            $html .= '</td>';
            $html .= '<td width="3%">&nbsp;</td>';
            $html .= '<td width="48.5%" valign="top" align="right" style="' . $border . 'padding:' . $cellPadding . ';">';
            $html .= '<table width="100%" style="table-layout:fixed;border-collapse:collapse;direction:rtl;"><tr>' . $bullet . '<td valign="top" align="right"><p dir="rtl" style="margin:0;color:#081d60;font-family:xbriyaz,Arial,sans-serif;font-size:' . $fontSize . 'px;font-weight:600;line-height:' . $lineHeight . ';text-align:right;white-space:pre-line;">' . $this->text($clause['ar'] ?? '') . '</p></td></tr></table>';
            $html .= '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';

        return $html . '</div>';
    }

    private function renderGoldBand(string $titleEn, string $titleAr): string
    {
        return '<table width="100%" style="table-layout:fixed;border-collapse:collapse;margin:0 0 5mm 0;"><tr>'
            . '<td width="48.5%" valign="top" style="background:#b69338;color:#ffffff;padding:2.5mm 3mm;font-size:14px;font-weight:900;line-height:1;" dir="ltr">' . $this->title($titleEn) . '</td>'
            . '<td width="3%">&nbsp;</td>'
            . '<td width="48.5%" valign="top" align="right" style="background:#b69338;color:#ffffff;padding:2.5mm 3mm;font-size:14px;font-weight:900;line-height:1;text-align:right;" dir="rtl">' . $this->title($titleAr) . '</td>'
            . '</tr></table>';
    }

    private function renderSectionTitle(string $titleEn, string $titleAr): string
    {
        return '<table width="100%" style="table-layout:fixed;border-collapse:collapse;border-bottom:1px solid #dfd4b7;margin:0 0 2mm 0;padding-bottom:2mm;"><tr>'
            . '<td width="48.5%" valign="top"><h2 dir="ltr" style="margin:0;color:#a07f31;font-size:10.5px;font-weight:900;line-height:1.22;">' . $this->title($titleEn) . '</h2></td>'
            . '<td width="3%">&nbsp;</td>'
            . '<td width="48.5%" valign="top" align="right"><h2 dir="rtl" style="margin:0;color:#a07f31;font-size:10.5px;font-weight:900;line-height:1.22;text-align:right;">' . $this->title($titleAr) . '</h2></td>'
            . '</tr></table>';
    }

    private function renderSignatures(array $section): string
    {
        $clause = ($section['clauses'] ?? [])[0] ?? [];

        return '<table width="100%" style="table-layout:fixed;border-collapse:collapse;border-top:4px solid #172357;background:#b69338;margin-top:3mm;"><tr>'
            . '<td width="50%" valign="top" align="left" style="padding:7mm 8mm;"><p dir="ltr" style="margin:0;color:#ffffff;font-size:12px;font-weight:900;line-height:1.7;white-space:pre-line;">' . $this->lines($clause['en'] ?? '') . '</p></td>'
            . '<td width="50%" valign="top" align="right" style="padding:7mm 8mm;"><p dir="rtl" style="margin:0;color:#ffffff;font-size:12px;font-weight:900;line-height:1.7;text-align:right;white-space:pre-line;">' . $this->lines($clause['ar'] ?? '') . '</p></td>'
            . '</tr></table>';
    }

    private function bulletCell(): string
    {
        return '<td width="5mm" valign="top"><span style="display:inline-block;color:#a07f31;font-size:12px;font-weight:900;line-height:1;">&bull;</span></td>';
    }

    private function statusBadge(string $status): string
    {
        return '<span style="display:inline-block;background:#fbf0cf;color:#a07f31;border-radius:20px;padding:2mm 3mm;font-size:7.6px;font-weight:900;text-transform:capitalize;">' . $this->e($status) . '</span>';
    }

    private function sectionMargin(array $section): float
    {
        return match ((string) ($section['kind'] ?? '')) {
            'banking' => 4,
            'signatures' => 0,
            default => 5,
        };
    }

    private function clauseFontSize(array $section, int $pageNumber): float
    {
        if (($section['kind'] ?? '') === 'banking') {
            return 8.1;
        }

        return match ($pageNumber) {
            3, 5 => 6.7,
            4, 6 => 7.3,
            7 => 7.7,
            default => 8.0,
        };
    }

    private function clauseLineHeight(array $section, int $pageNumber): float
    {
        if (($section['kind'] ?? '') === 'banking') {
            return 1.17;
        }

        return match ($pageNumber) {
            3, 5 => 1.02,
            4, 6 => 1.08,
            7 => 1.15,
            default => 1.18,
        };
    }

    private function publicSettings(): array
    {
        try {
            return app(SettingsService::class)->getPublicSettings();
        } catch (\Throwable) {
            return [];
        }
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

    private function text(mixed $value): string
    {
        return $this->lines($this->stripLeadingBullets((string) $value));
    }

    private function title(mixed $value): string
    {
        return $this->lines(str_replace('\n', "\n", (string) $value));
    }

    private function stripLeadingBullets(string $value): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $value) ?: [];

        return collect($lines)
            ->map(fn (string $line) => preg_replace('/^\s*[•▪]\s*/u', '', $line) ?? $line)
            ->implode("\n");
    }
}

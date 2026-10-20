<?php

namespace App\Services;

use App\Models\Company;
use App\Support\Money;
use Carbon\Carbon;

class CompanyStatementPdfHtmlRenderer
{
    public function __construct(
        private readonly CompanyStatementService $statementService,
        private readonly SettingsService $settingsService,
    ) {}

    public function render(Company $company, array $filters, bool $autoPrint = false, string $locale = 'en'): string
    {
        // Enforce unpaginated complete period for PDF / Print export
        $statementFilters = array_merge($filters, ['all' => true, 'per_page' => 1000]);
        $statement = $this->statementService->getStatement($company, $statementFilters);
        $issuer = $this->issuer();
        $currency = $statement['currency'];
        $isRtl = $locale === 'ar';
        $dir = $isRtl ? 'rtl' : 'ltr';

        $transactions = $statement['transactions']['data'] ?? [];
        $activeInvoices = $statement['supporting_schedules']['active_invoices'] ?? [];
        $unallocatedCredits = $statement['supporting_schedules']['unallocated_credits'] ?? [];

        $logoHtml = '<img src="' . $this->logoDataUri() . '" alt="Legendary Management MEA" class="logo">';

        $txRows = collect($transactions)
            ->map(fn (array $tx) => $this->transactionRow($tx, $currency, $isRtl))
            ->implode('');

        $activeInvRows = collect($activeInvoices)
            ->map(fn (array $inv) => $this->activeInvoiceRow($inv, $currency, $isRtl))
            ->implode('');

        $pageStyle = $autoPrint ? '@page{size:A4 portrait;margin:10mm}' : '@page{size:A4 portrait;margin:10mm}';
        $script = $autoPrint
            ? '<script>window.addEventListener("load",function(){window.setTimeout(function(){window.print();},250);});</script>'
            : '';

        $title = $isRtl ? 'كشف حساب شركة' : 'STATEMENT OF ACCOUNT';
        $reference = "SOA-{$company->reference}-" . Carbon::now('UTC')->format('Ymd');

        return '<!doctype html><html lang="' . $locale . '" dir="' . $dir . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $this->e($title . ' - ' . $company->name) . '</title>
<style>' . $pageStyle . '
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#081d60;font-family:montserrat,montserratarabic,Arial,sans-serif;font-size:8.5pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:100%;margin:0 auto}
.header{width:100%;border-collapse:collapse;border-bottom:2px solid #a07f31;margin-bottom:4mm;padding-bottom:2mm}
.header td{vertical-align:top;padding:0 0 2mm}
.logo{display:block;width:44mm;height:auto;margin-bottom:2mm}
.issuer-name{font-size:11pt;font-weight:bold;color:#081d60}
.issuer-copy{margin-top:.5mm;color:#626968;font-size:7.5pt;line-height:1.35}
.document-mark{text-align:' . ($isRtl ? 'left' : 'right') . '}
.eyebrow{color:#a07f31;font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
.document-mark h1{margin:1mm 0 1mm;font-size:16pt;line-height:1.1;color:#081d60}
.badge{display:inline-block;padding:1mm 2.5mm;border-radius:4mm;background:#f6e8bd;color:#715719;font-size:7.5pt;font-weight:bold}
.badge-reconciled{background:#e1f5ee;color:#0f5132}

.client-section{width:100%;border-collapse:collapse;margin-bottom:3.5mm;background:#fcfcf8;border:1px solid #e1e3e9;border-radius:2mm}
.client-section td{vertical-align:top;padding:2.5mm 3.5mm}
.card-label{font-size:7pt;color:#a07f31;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.card-title{font-size:10.5pt;font-weight:bold;color:#081d60;margin:1mm 0}

.summary-table{width:100%;border-collapse:collapse;margin-bottom:4mm;background:#fff;border:1px solid #dde0e7}
.summary-table th{background:#081d60;color:#fff;font-size:7pt;text-transform:uppercase;padding:2mm 2.5mm;text-align:' . ($isRtl ? 'right' : 'left') . '}
.summary-table td{padding:2mm 2.5mm;border-bottom:1px solid #e5e6ea;font-size:8pt;vertical-align:middle}
.summary-table .amount{text-align:' . ($isRtl ? 'left' : 'right') . ';font-weight:bold;font-family:monospace,sans-serif}
.summary-table .highlight{background:#fcfcf8;font-weight:bold;color:#081d60}

.ledger-table{width:100%;border-collapse:collapse;margin-bottom:4mm;table-layout:fixed}
.ledger-table th{background:#081d60;color:#fff;font-size:7pt;text-transform:uppercase;padding:2mm 1.5mm;text-align:' . ($isRtl ? 'right' : 'left') . '}
.ledger-table td{padding:2mm 1.5mm;border-bottom:1px solid #e5e6ea;font-size:7.5pt;vertical-align:top;word-break:break-word}
.ledger-table tr{page-break-inside:avoid}
.ledger-table .num{text-align:' . ($isRtl ? 'left' : 'right') . ';white-space:nowrap;font-family:monospace,sans-serif}
.ledger-table .debit{color:#b3261e;font-weight:600}
.ledger-table .credit{color:#137333;font-weight:600}
.ledger-table .net{color:#081d60;font-weight:bold}
.sub-meta{color:#626968;font-size:6.5pt;margin-top:.5mm}

.schedules{width:100%;border-collapse:collapse;margin-bottom:4mm}
.schedules th{background:#f1f3f9;color:#081d60;font-size:7pt;text-transform:uppercase;padding:1.5mm 2mm;text-align:' . ($isRtl ? 'right' : 'left') . '}
.schedules td{padding:1.5mm 2mm;border-bottom:1px solid #e5e6ea;font-size:7.5pt}

.footer{width:100%;border-collapse:collapse;border-top:1px solid #d9dce5;margin-top:4mm;page-break-inside:avoid}
.footer td{padding-top:2mm;vertical-align:top;color:#626968;font-size:7pt}
.footer strong{color:#081d60;font-size:8pt}
.footer .meta-right{text-align:' . ($isRtl ? 'left' : 'right') . '}

.no-print{margin:0 0 4mm;text-align:' . ($isRtl ? 'left' : 'right') . '}
.no-print button{border:0;border-radius:4px;padding:8px 16px;background:#081d60;color:#fff;font:700 12px Arial;cursor:pointer}
@media print{.no-print{display:none}.page{width:auto}tr{break-inside:avoid}}
</style></head><body><div class="page">'
            . ($autoPrint ? '<div class="no-print"><button type="button" onclick="window.print()">' . ($isRtl ? 'طباعة كشف الحساب' : 'Print Statement') . '</button></div>' : '')
            . '<table class="header"><tr><td width="55%">' . $logoHtml
            . '<div class="issuer-name">' . $this->e($issuer['name']) . '</div>'
            . '<div class="issuer-copy">' . $this->e($issuer['address']) . '<br><span dir="ltr">' . $this->e($issuer['phone']) . '</span> | <span dir="ltr">' . $this->e($issuer['email']) . '</span></div></td>'
            . '<td width="45%" class="document-mark"><span class="eyebrow">' . ($isRtl ? 'كشف حساب مالي' : 'Account Statement') . '</span>'
            . '<h1 dir="ltr">' . $this->e($reference) . '</h1>'
            . '<span class="badge">' . $this->e($currency) . '</span> '
            . '<span class="badge badge-reconciled">' . ($statement['summary']['reconciliation']['is_reconciled'] ? ($isRtl ? 'مطابق وموزون' : 'Balanced & Reconciled') : ($isRtl ? 'قيد التدقيق' : 'Unreconciled')) . '</span>'
            . '<div class="sub-meta">' . ($isRtl ? 'الفترة:' : 'Period:') . ' ' . $statement['period']['start_date'] . ' ' . ($isRtl ? 'إلى' : 'to') . ' ' . $statement['period']['end_date'] . '</div>'
            . '</td></tr></table>'

            // Client & Statement Overview Box
            . '<table class="client-section"><tr>'
            . '<td width="55%"><span class="card-label">' . ($isRtl ? 'العميل' : 'Account / Company') . '</span>'
            . '<div class="card-title">' . $this->e($company->name) . '</div>'
            . ($company->legal_name && $company->legal_name !== $company->name ? '<div style="font-size:8pt;color:#626968;">' . $this->e($company->legal_name) . '</div>' : '')
            . '<div style="font-size:7.5pt;color:#626968;margin-top:1mm;">'
            . ($company->reference ? '<span>' . ($isRtl ? 'المرجع:' : 'Ref:') . ' <strong dir="ltr">' . $this->e($company->reference) . '</strong></span> | ' : '')
            . ($company->tax_number ? '<span>' . ($isRtl ? 'الرقم الضريبي:' : 'TRN:') . ' <span dir="ltr">' . $this->e($company->tax_number) . '</span></span> | ' : '')
            . ($company->country_code ? '<span>' . $this->e($company->country_code) . ($company->city ? ', ' . $this->e($company->city) : '') . '</span>' : '')
            . '</div></td>'
            . '<td width="45%"><span class="card-label">' . ($isRtl ? 'ملخص المركز المالي' : 'Financial Position') . '</span>'
            . '<table style="width:100%;margin-top:1mm;font-size:7.5pt;border-collapse:collapse;">'
            . '<tr><td style="color:#626968;">' . ($isRtl ? 'مستحقات الفواتير القائمة:' : 'Closing Receivables:') . '</td><td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-weight:bold;">' . $this->money($statement['summary']['closing_balance']['receivables'], $currency) . '</td></tr>'
            . '<tr><td style="color:#626968;">' . ($isRtl ? 'رصيد الشركة الدائن المتاح:' : 'Available Company Credit:') . '</td><td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-weight:bold;color:#137333;">' . $this->money($statement['summary']['closing_balance']['unallocated_credit'], $currency) . '</td></tr>'
            . '<tr style="border-top:1px solid #dde0e7;"><td style="font-weight:bold;color:#081d60;padding-top:1mm;">' . ($isRtl ? 'صافي المركز المالي:' : 'Net Position:') . '</td><td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-weight:bold;color:#a07f31;font-size:8.5pt;padding-top:1mm;">' . $this->money($statement['summary']['closing_balance']['net_position'], $currency) . '</td></tr>'
            . '</table></td>'
            . '</tr></table>'

            // Financial Summary Block
            . '<div style="margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'حركات الفترة والرصيد الافتتاحي' : 'Statement Period Summary & Movements') . '</div>'
            . '<table class="summary-table"><thead><tr>'
            . '<th>' . ($isRtl ? 'البيان' : 'Component') . '</th>'
            . '<th style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'مدين / فواتير (+)' : 'Invoiced / Receivables (+)') . '</th>'
            . '<th style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'دائن / مدفوعات (-)' : 'Payments / Applied (-)') . '</th>'
            . '<th style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'الصافي' : 'Net Position') . '</th>'
            . '</tr></thead><tbody>'
            . '<tr><td><strong>' . ($isRtl ? 'الرصيد الافتتاحي (بداية الفترة)' : 'Opening Balance (Period Start)') . '</strong></td>'
            . '<td class="amount">' . $this->money($statement['summary']['opening_balance']['receivables'], $currency) . '</td>'
            . '<td class="amount">' . $this->money($statement['summary']['opening_balance']['unallocated_credit'], $currency) . '</td>'
            . '<td class="amount highlight">' . $this->money($statement['summary']['opening_balance']['net_position'], $currency) . '</td></tr>'
            . '<tr><td>' . ($isRtl ? 'حركات الفترة (فواتير، مقبوضات، تسويات)' : 'Period Activity (Invoices, Receipts, Allocations)') . '</td>'
            . '<td class="amount">' . $this->money($statement['summary']['period_movements']['invoiced_total'], $currency) . '</td>'
            . '<td class="amount">' . $this->money($statement['summary']['period_movements']['payments_received'], $currency) . '</td>'
            . '<td class="amount highlight">' . $this->money($statement['summary']['period_movements']['net_change'], $currency) . '</td></tr>'
            . '<tr style="background:#f6f8fd;font-weight:bold;"><td><strong>' . ($isRtl ? 'الرصيد الختامي (نهاية الفترة)' : 'Closing Balance (Period End)') . '</strong></td>'
            . '<td class="amount">' . $this->money($statement['summary']['closing_balance']['receivables'], $currency) . '</td>'
            . '<td class="amount">' . $this->money($statement['summary']['closing_balance']['unallocated_credit'], $currency) . '</td>'
            . '<td class="amount highlight" style="color:#a07f31;font-size:9pt;">' . $this->money($statement['summary']['closing_balance']['net_position'], $currency) . '</td></tr>'
            . '</tbody></table>'

            // Chronological Ledger Table
            . '<div style="margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'سجل الحركات الزمني' : 'Chronological Transaction Ledger') . '</div>'
            . '<table class="ledger-table"><thead><tr>'
            . '<th width="12%">' . ($isRtl ? 'التاريخ' : 'Date') . '</th>'
            . '<th width="15%">' . ($isRtl ? 'النوع' : 'Type') . '</th>'
            . '<th width="14%">' . ($isRtl ? 'المرجع' : 'Reference') . '</th>'
            . '<th width="27%">' . ($isRtl ? 'الوصف والتفاصيل' : 'Description / Allocation') . '</th>'
            . '<th width="10%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'مدين (+)' : 'Debit (+)') . '</th>'
            . '<th width="10%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'دائن (-)' : 'Credit (-)') . '</th>'
            . '<th width="12%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'الرصيد' : 'Balance') . '</th>'
            . '</tr></thead><tbody>'
            . ($txRows ?: '<tr><td colspan="7" style="text-align:center;padding:4mm;color:#626968;">' . ($isRtl ? 'لا توجد حركات مسجلة خلال الفترة المحددة.' : 'No transactions recorded within this period.') . '</td></tr>')
            . '</tbody></table>'

            // Supporting Schedules (Active Invoices)
            . (!empty($activeInvoices) ? (
                '<div style="margin-top:2mm;margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'جدول الفواتير المستحقة القائمة (كما في نهاية الفترة)' : 'Outstanding Active Invoices Schedule (As of Period End)') . '</div>'
                . '<table class="schedules"><thead><tr>'
                . '<th width="16%">' . ($isRtl ? 'رقم الفاتورة' : 'Invoice Ref') . '</th>'
                . '<th width="14%">' . ($isRtl ? 'تاريخ الإصدار' : 'Issue Date') . '</th>'
                . '<th width="14%">' . ($isRtl ? 'تاريخ الاستحقاق' : 'Due Date') . '</th>'
                . '<th width="18%">' . ($isRtl ? 'الحالة' : 'Status') . '</th>'
                . '<th width="18%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'إجمالي الفاتورة' : 'Total Amount') . '</th>'
                . '<th width="20%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'المتبقي المستحق' : 'Balance Due') . '</th>'
                . '</tr></thead><tbody>'
                . $activeInvRows
                . '</tbody></table>'
            ) : '')

            . $this->footer($issuer, $isRtl)
            . '</div>' . $script . '</body></html>';
    }

    private function transactionRow(array $tx, string $currency, bool $isRtl): string
    {
        $dateStr = Carbon::parse($tx['date'])->format('Y-m-d');
        $debitStr = (float) $tx['debit'] > 0 ? $this->money($tx['debit'], $currency) : '-';
        $creditStr = (float) $tx['credit'] > 0 ? $this->money($tx['credit'], $currency) : '-';
        $balanceStr = $this->money($tx['running_balance'], $currency);

        $bookingRefStr = !empty($tx['booking_references'])
            ? '<br><span class="sub-meta">' . ($isRtl ? 'الحجز:' : 'Booking:') . ' ' . $this->e(implode(', ', $tx['booking_references'])) . '</span>'
            : '';

        $desc = $this->e($tx['description']) . $bookingRefStr;

        return '<tr>'
            . '<td style="font-family:monospace;">' . $this->e($dateStr) . '</td>'
            . '<td><span class="badge" style="font-size:6.5pt;">' . $this->e($tx['type_label']) . '</span></td>'
            . '<td style="font-weight:600;font-family:monospace;">' . $this->e($tx['reference']) . '</td>'
            . '<td>' . $desc . '</td>'
            . '<td class="num debit">' . $debitStr . '</td>'
            . '<td class="num credit">' . $creditStr . '</td>'
            . '<td class="num net">' . $balanceStr . '</td>'
            . '</tr>';
    }

    private function activeInvoiceRow(array $inv, string $currency, bool $isRtl): string
    {
        $booking = !empty($inv['booking_references']) ? ' <span class="sub-meta">(' . $this->e(implode(', ', $inv['booking_references'])) . ')</span>' : '';

        return '<tr>'
            . '<td style="font-weight:600;font-family:monospace;">' . $this->e($inv['reference']) . $booking . '</td>'
            . '<td>' . $this->e($inv['issue_date']) . '</td>'
            . '<td>' . $this->e($inv['due_date'] ?? '-') . '</td>'
            . '<td><span class="badge" style="font-size:6.5pt;">' . $this->e(ucfirst(str_replace('_', ' ', $inv['status']))) . '</span></td>'
            . '<td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-family:monospace;">' . $this->money($inv['total_amount'], $currency) . '</td>'
            . '<td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-weight:bold;font-family:monospace;color:#a07f31;">' . $this->money($inv['balance_due'], $currency) . '</td>'
            . '</tr>';
    }

    private function footer(array $issuer, bool $isRtl): string
    {
        $now = Carbon::now('UTC')->toIso8601String();
        $disclaimer = $isRtl
            ? 'هذا كشف حساب مالي رسمي معتمد صادر إلكترونياً من نظام الإدارة المالية لشركة Legendary Management MEA. الأرصدة المبينة مطابقة لكافة السجلات المالية المسجلة حتى تاريخه.'
            : 'This is an official Statement of Account issued electronically from the Legendary Management MEA financial system. The recorded balances reflect authoritative transaction ledger entries.';

        return '<table class="footer"><tr>'
            . '<td width="60%"><strong>' . $this->e($issuer['name']) . '</strong><br>' . $disclaimer . '</td>'
            . '<td width="40%" class="meta-right"><span dir="ltr">' . $this->e($issuer['phone']) . ' | ' . $this->e($issuer['email']) . '</span><br>'
            . '<span style="font-size:6.5pt;color:#9aa0a6;">' . ($isRtl ? 'تاريخ التوليد:' : 'Generated At:') . ' ' . $now . '</span></td>'
            . '</tr></table>';
    }

    private function issuer(): array
    {
        try {
            $settings = $this->settingsService->getPublicSettings();
        } catch (\Throwable) {
            $settings = [];
        }

        $general = $settings['general'] ?? [];
        $contact = $settings['contact'] ?? [];

        return [
            'name' => trim((string) ($general['company_display_name'] ?? '')) ?: 'Legendary Management MEA',
            'address' => trim((string) ($contact['address_en'] ?? '')) ?: 'Riyadh, Saudi Arabia | Dubai, UAE',
            'phone' => trim((string) ($contact['phone'] ?? '')) ?: '+966 53 314 4910',
            'email' => trim((string) ($contact['public_email'] ?? '')) ?: 'finance@legendarymea.com',
        ];
    }

    private function money(mixed $amount, string $currency): string
    {
        $normalized = Money::normalize($amount, $currency);
        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '');

        return strtoupper($currency) . ' ' . number_format((int) $whole, 0, '.', ',') . ($fraction !== '' ? '.' . $fraction : '');
    }

    private function logoDataUri(): string
    {
        $path = public_path('legendary-management.png');
        if (! is_file($path) || ! is_readable($path)) {
            return '';
        }

        return 'data:image/png;base64,' . base64_encode((string) file_get_contents($path));
    }

    private function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

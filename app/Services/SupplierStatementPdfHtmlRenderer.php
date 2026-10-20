<?php

namespace App\Services;

use App\Models\Supplier;
use App\Support\Money;
use Carbon\Carbon;

class SupplierStatementPdfHtmlRenderer
{
    public function __construct(
        private readonly SupplierStatementService $statementService,
        private readonly SettingsService $settingsService,
    ) {}

    public function render(Supplier $supplier, array $filters, bool $autoPrint = false, string $locale = 'en'): string
    {
        // Enforce unpaginated complete period for PDF / Print export
        $statementFilters = array_merge($filters, ['all' => true, 'per_page' => 1000]);
        $statement = $this->statementService->getStatement($supplier, $statementFilters);
        $issuer = $this->issuer();
        $currency = $statement['currency'];
        $isRtl = $locale === 'ar';
        $dir = $isRtl ? 'rtl' : 'ltr';

        $transactions = $statement['transactions']['data'] ?? [];
        $fundingSchedule = $statement['supporting_schedules']['funding_schedule'] ?? [];
        $usageSchedule = $statement['supporting_schedules']['invoice_usage_schedule'] ?? [];

        $logoHtml = '<img src="' . $this->logoDataUri() . '" alt="Legendary Management MEA" class="logo">';

        $txRows = collect($transactions)
            ->map(fn (array $tx) => $this->transactionRow($tx, $currency, $isRtl))
            ->implode('');

        $fundingRows = collect($fundingSchedule)
            ->map(fn (array $f) => $this->fundingRow($f, $currency, $isRtl))
            ->implode('');

        $usageRows = collect($usageSchedule)
            ->map(fn (array $u) => $this->usageRow($u, $currency, $isRtl))
            ->implode('');

        $pageStyle = '@page{size:A4 portrait;margin:10mm}';
        $script = $autoPrint
            ? '<script>window.addEventListener("load",function(){window.setTimeout(function(){window.print();},250);});</script>'
            : '';

        $title = $isRtl ? 'كشف حساب مورد' : 'SUPPLIER STATEMENT OF ACCOUNT';
        $summary = $statement['summary'];
        $opening = $summary['opening_balance'];
        $movements = $summary['period_movements'];
        $closing = $summary['closing_balance'];
        $reconciliation = $summary['reconciliation'];

        $reconBadgeClass = $reconciliation['is_reconciled'] ? 'badge-reconciled' : 'badge-unreconciled';
        $reconText = $reconciliation['is_reconciled']
            ? ($isRtl ? 'مطابق مع سجل الحساب' : 'Reconciled with Ledger')
            : ($isRtl ? 'يوجد عدم تطابق' : 'Discrepancy Detected');

        $statusBadge = match ($closing['position_status']) {
            'in_funds' => '<span class="badge badge-reconciled">' . ($isRtl ? 'رصيد دائن متاح للشركة' : 'Advance Funds Available') . '</span>',
            'owing' => '<span class="badge badge-owing">' . ($isRtl ? 'مستحق للمورد' : 'Amount Owed to Supplier') . '</span>',
            default => '<span class="badge">' . ($isRtl ? 'الحساب متوازن' : 'Fully Settled') . '</span>',
        };

        return '<!doctype html><html lang="' . $locale . '" dir="' . $dir . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $this->e($title . ' - ' . $supplier->name) . '</title>
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
.badge-unreconciled{background:#fce8e6;color:#c5221f}
.badge-owing{background:#fef7e0;color:#b06000}

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
            . '<div class="issuer-copy">' . $this->e($issuer['address']) . '<br>' . $this->e($issuer['phone']) . ' | ' . $this->e($issuer['email']) . '</div></td>'
            . '<td width="45%" class="document-mark"><div class="eyebrow">' . ($isRtl ? 'الإدارة المالية — حسابات الموردين' : 'FINANCIAL MANAGEMENT — SUPPLIER ACCOUNTS') . '</div>'
            . '<h1>' . $this->e($title) . '</h1>'
            . '<div><span class="badge ' . $reconBadgeClass . '">' . $reconText . '</span> ' . $statusBadge . '</div></td></tr></table>'

            // Supplier Profile & Statement Period
            . '<table class="client-section"><tr><td width="50%">'
            . '<div class="card-label">' . ($isRtl ? 'بيانات المورد' : 'Supplier Details') . '</div>'
            . '<div class="card-title">' . $this->e($supplier->name) . '</div>'
            . '<div style="font-size:7.5pt;color:#626968;line-height:1.4;">'
            . '<strong>' . ($isRtl ? 'الرمز المرجعي:' : 'Reference:') . '</strong> <span dir="ltr">' . $this->e($supplier->reference) . '</span><br>'
            . ($supplier->email ? '<strong>' . ($isRtl ? 'البريد الإلكتروني:' : 'Email:') . '</strong> ' . $this->e($supplier->email) . '<br>' : '')
            . ($supplier->mobile ? '<strong>' . ($isRtl ? 'الهاتف:' : 'Phone:') . '</strong> <span dir="ltr">' . $this->e($supplier->mobile) . '</span><br>' : '')
            . ($supplier->address ? '<strong>' . ($isRtl ? 'العنوان:' : 'Address:') . '</strong> ' . $this->e($supplier->address) : '')
            . '</div></td>'
            . '<td width="50%">'
            . '<div class="card-label">' . ($isRtl ? 'فترة كشف الحساب والعملة' : 'Statement Period & Currency') . '</div>'
            . '<div class="card-title" dir="ltr">' . $this->e($statement['period']['start_date']) . ' &rarr; ' . $this->e($statement['period']['end_date']) . '</div>'
            . '<div style="font-size:7.5pt;color:#626968;line-height:1.4;">'
            . '<strong>' . ($isRtl ? 'العملة المختارة:' : 'Statement Currency:') . '</strong> <strong>' . $this->e($currency) . '</strong><br>'
            . '<strong>' . ($isRtl ? 'كما في تاريخ:' : 'As of:') . '</strong> ' . $this->e(substr($statement['period']['as_of_date'], 0, 10)) . '<br>'
            . '<strong>' . ($isRtl ? 'الرصيد الحالي بالمحفظة:' : 'Current Stored Balance:') . '</strong> <span dir="ltr">' . $this->money($reconciliation['account_current_balance'], $currency) . '</span>'
            . '</div></td></tr></table>'

            // Summary Table
            . '<table class="summary-table"><thead><tr>'
            . '<th width="34%">' . ($isRtl ? 'الرصيد الافتتاحي' : 'Opening Balance') . '</th>'
            . '<th width="33%">' . ($isRtl ? 'صافي حركات الفترة' : 'Period Net Movement') . '</th>'
            . '<th width="33%">' . ($isRtl ? 'الرصيد الختامي للفترة' : 'Closing Period Balance') . '</th>'
            . '</tr></thead><tbody><tr>'
            . '<td>'
            . ($isRtl ? 'الرصيد المرحل:' : 'Brought Forward:') . ' <span class="amount">' . $this->money($opening['balance'], $currency) . '</span><br>'
            . '<span class="sub-meta">' . ($isRtl ? 'المتاح للشركة: ' : 'Available: ') . $this->money($opening['available_funds'], $currency) . '</span>'
            . '</td>'
            . '<td>'
            . ($isRtl ? 'إجمالي التمويل: ' : 'Funding: ') . '<span class="amount credit" style="color:#137333;">+' . $this->money($movements['funding_total'], $currency) . '</span><br>'
            . ($isRtl ? 'استخدام الخدمات: ' : 'Usage: ') . '<span class="amount debit" style="color:#b3261e;">-' . $this->money($movements['usage_total'], $currency) . '</span><br>'
            . '<span class="sub-meta">' . ($isRtl ? 'صافي التسويات: ' : 'Net Adj: ') . $this->money($movements['net_adjustments'], $currency) . ' | ' . ($isRtl ? 'العكوسات: ' : 'Reversals: ') . $this->money($movements['reversals_total'], $currency) . '</span>'
            . '</td>'
            . '<td class="highlight">'
            . '<span class="amount" style="font-size:9.5pt;">' . $this->money($closing['balance'], $currency) . '</span><br>'
            . ((float) $closing['amount_owed'] > 0
                ? '<span class="sub-meta" style="color:#b3261e;font-weight:bold;">' . ($isRtl ? 'المستحق للمورد: ' : 'Owed: ') . $this->money($closing['amount_owed'], $currency) . '</span>'
                : '<span class="sub-meta" style="color:#137333;font-weight:bold;">' . ($isRtl ? 'المتاح للشركة: ' : 'Available: ') . $this->money($closing['available_funds'], $currency) . '</span>')
            . '</td>'
            . '</tr></tbody></table>'

            // Transaction Ledger Table
            . '<div style="margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'سجل الحركات الزمني للمورد' : 'Chronological Supplier Transaction Ledger') . '</div>'
            . '<table class="ledger-table"><thead><tr>'
            . '<th width="12%">' . ($isRtl ? 'التاريخ' : 'Date') . '</th>'
            . '<th width="15%">' . ($isRtl ? 'النوع' : 'Type') . '</th>'
            . '<th width="14%">' . ($isRtl ? 'المرجع' : 'Reference') . '</th>'
            . '<th width="27%">' . ($isRtl ? 'الوصف والتفاصيل' : 'Description / Allocation') . '</th>'
            . '<th width="10%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'مدين (-)' : 'Debit (-)') . '</th>'
            . '<th width="10%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'دائن (+)' : 'Credit (+)') . '</th>'
            . '<th width="12%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'الرصيد' : 'Balance') . '</th>'
            . '</tr></thead><tbody>'
            . ($txRows ?: '<tr><td colspan="7" style="text-align:center;padding:4mm;color:#626968;">' . ($isRtl ? 'لا توجد حركات مسجلة خلال الفترة المحددة.' : 'No transactions recorded within this period.') . '</td></tr>')
            . '</tbody></table>'

            // Supporting Schedule: Funding Deposits
            . (!empty($fundingSchedule) ? (
                '<div style="margin-top:2mm;margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'جدول تمويل رصيد المورد (الودائع والمدفوعات المسبقة)' : 'Supplier Funding Schedule (Advance Deposits)') . '</div>'
                . '<table class="schedules"><thead><tr>'
                . '<th width="18%">' . ($isRtl ? 'المرجع' : 'Ledger Ref') . '</th>'
                . '<th width="14%">' . ($isRtl ? 'التاريخ' : 'Date') . '</th>'
                . '<th width="18%">' . ($isRtl ? 'طريقة الدفع' : 'Payment Method') . '</th>'
                . '<th width="20%">' . ($isRtl ? 'المرجع البنكي / الخارجي' : 'External / Wire Ref') . '</th>'
                . '<th width="15%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'المبلغ' : 'Amount') . '</th>'
                . '<th width="15%">' . ($isRtl ? 'ملاحظات' : 'Notes') . '</th>'
                . '</tr></thead><tbody>'
                . $fundingRows
                . '</tbody></table>'
            ) : '')

            // Supporting Schedule: Invoice Usage
            . (!empty($usageSchedule) ? (
                '<div style="margin-top:2mm;margin-bottom:1.5mm;font-size:8pt;font-weight:bold;color:#081d60;">' . ($isRtl ? 'جدول استخدام خدمات المورد في الفواتير' : 'Supplier Service Usage Schedule') . '</div>'
                . '<table class="schedules"><thead><tr>'
                . '<th width="15%">' . ($isRtl ? 'رقم الفاتورة' : 'Invoice Ref') . '</th>'
                . '<th width="15%">' . ($isRtl ? 'رقم الحجز' : 'Booking Ref') . '</th>'
                . '<th width="12%">' . ($isRtl ? 'التاريخ' : 'Date') . '</th>'
                . '<th width="26%">' . ($isRtl ? 'الخدمة / البند' : 'Service Item') . '</th>'
                . '<th width="10%">' . ($isRtl ? 'الكمية' : 'Qty') . '</th>'
                . '<th width="11%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'سعر الوحدة' : 'Unit Cost') . '</th>'
                . '<th width="11%" style="text-align:' . ($isRtl ? 'left' : 'right') . '">' . ($isRtl ? 'التكلفة الإجمالية' : 'Total Cost') . '</th>'
                . '</tr></thead><tbody>'
                . $usageRows
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

        $bookingRefStr = !empty($tx['booking_reference'])
            ? '<br><span class="sub-meta">' . ($isRtl ? 'الحجز:' : 'Booking:') . ' ' . $this->e($tx['booking_reference']) . '</span>'
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

    private function fundingRow(array $f, string $currency, bool $isRtl): string
    {
        return '<tr>'
            . '<td style="font-weight:600;font-family:monospace;">' . $this->e($f['ledger_reference']) . '</td>'
            . '<td>' . $this->e($f['transaction_date']) . '</td>'
            . '<td>' . $this->e(ucfirst(str_replace('_', ' ', $f['payment_method'] ?? '-'))) . '</td>'
            . '<td><span style="font-family:monospace;">' . $this->e($f['external_reference'] ?? '-') . '</span></td>'
            . '<td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-family:monospace;font-weight:bold;color:#137333;">' . $this->money($f['amount'], $currency) . '</td>'
            . '<td>' . $this->e($f['notes'] ?? '-') . '</td>'
            . '</tr>';
    }

    private function usageRow(array $u, string $currency, bool $isRtl): string
    {
        $booking = !empty($u['booking_reference']) ? '<span style="font-family:monospace;font-weight:600;">' . $this->e($u['booking_reference']) . '</span>' : '-';
        $reversedBadge = !empty($u['is_reversed'])
            ? ' <span class="badge badge-unreconciled" style="font-size:6pt;">' . ($isRtl ? 'معكوس' : 'Reversed') . '</span>'
            : '';

        return '<tr>'
            . '<td style="font-weight:600;font-family:monospace;">' . $this->e($u['invoice_reference'] ?? '-') . $reversedBadge . '</td>'
            . '<td>' . $booking . '</td>'
            . '<td>' . $this->e($u['transaction_date']) . '</td>'
            . '<td>' . $this->e($u['service_description']) . '</td>'
            . '<td>' . $this->e($u['quantity'] ?? '1') . '</td>'
            . '<td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-family:monospace;">' . ($u['unit_cost'] ? $this->money($u['unit_cost'], $currency) : '-') . '</td>'
            . '<td style="text-align:' . ($isRtl ? 'left' : 'right') . ';font-family:monospace;font-weight:bold;color:#b3261e;">' . $this->money($u['total_cost'], $currency) . '</td>'
            . '</tr>';
    }

    private function footer(array $issuer, bool $isRtl): string
    {
        $now = Carbon::now('UTC')->toIso8601String();
        $disclaimer = $isRtl
            ? 'هذا كشف حساب مورد مالي رسمي معتمد صادر إلكترونياً من نظام الإدارة المالية لشركة Legendary Management MEA. الأرصدة المبينة مطابقة لسجلات التمويل واستخدام الخدمات المسجلة.'
            : 'This is an official Supplier Statement of Account issued electronically from the Legendary Management MEA financial system. The recorded balances reflect authoritative transaction ledger entries.';

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

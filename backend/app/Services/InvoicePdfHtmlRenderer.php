<?php

namespace App\Services;

use App\Models\Invoice;

class InvoicePdfHtmlRenderer
{
    public function __construct(private readonly InvoiceDocumentBuilder $documents) {}

    public function render(Invoice $invoice, bool $autoPrint = false): string
    {
        $document = $this->documents->build($invoice);
        $issuer = $this->issuer();
        $logoHtml = '<img src="' . $this->logoDataUri() . '" alt="Legendary Management MEA" class="logo">';
        $items = collect($document['items'])
            ->map(fn (array $item) => $this->itemRow($item, $document['currency']))
            ->implode('');
        $pageStyle = $autoPrint ? '@page{size:A4;margin:12mm}' : '';
        $script = $autoPrint
            ? '<script>window.addEventListener("load",function(){window.setTimeout(function(){window.print();},250);});</script>'
            : '';

        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $this->e($document['reference']) . '</title>
<style>' . $pageStyle . '
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#081d60;font-family:montserrat,montserratarabic,Arial,sans-serif;font-size:9.5pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%;margin:0 auto}.header{width:100%;border-collapse:collapse;border-bottom:1px solid #d9dce5;margin-bottom:3mm}.header td{vertical-align:top;padding:0 0 3mm}.logo{display:block;width:48mm;height:auto;margin-bottom:2mm}.issuer-name{font-size:12.5pt;font-weight:bold;color:#081d60}.issuer-copy{margin-top:.5mm;color:#626968;font-size:8.5pt;line-height:1.4}.document-mark{text-align:right}.eyebrow,.section-kicker{color:#a07f31;font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px}.document-mark h1{margin:1mm 0 1.5mm;font-size:21pt;line-height:1.05;color:#081d60}.badge{display:inline-block;padding:1mm 3mm;border-radius:8mm;background:#f6e8bd;color:#715719;font-size:8pt;font-weight:bold;text-transform:capitalize}.section{margin-bottom:3mm;padding:3.5mm;border:1px solid #e1e3e9;background:#fcfcf8}.section-title{margin:0 0 2.5mm;color:#081d60;font-size:11pt}.summary-grid{width:100%;border-collapse:separate;border-spacing:0}.summary-grid td{width:50%;vertical-align:top;padding:3mm;border:1px solid #e4e5e9;background:#fff}.summary-grid td+td{border-left:2mm solid #fcfcf8}.card-name{display:block;margin:1mm 0 1.5mm;color:#081d60;font-size:12.5pt;line-height:1.15}.muted{color:#626968;font-size:8.5pt}.details{width:100%;border-collapse:collapse}.details td{width:50%;padding:1mm 1.5mm 1.5mm 0;vertical-align:top}.details strong{color:#081d60;font-size:8.5pt;word-break:break-word}.services{width:100%;border-collapse:collapse;table-layout:fixed}.services th{padding:2mm 1.5mm;background:#081d60;color:#fff;font-size:7.5pt;text-align:left}.services td{padding:2mm 1.5mm;border-bottom:1px solid #e5e6ea;vertical-align:top;font-size:8.5pt;word-break:break-word}.services tr{page-break-inside:avoid}.services .num{text-align:right;white-space:nowrap}.service-name{display:block;color:#081d60;font-weight:bold}.service-meta{display:block;margin-top:.5mm;color:#626968;font-size:7.5pt;line-height:1.3}.financial{width:82mm;margin-left:auto;border-collapse:collapse;background:#fff;border:1px solid #dde0e7;page-break-inside:avoid}.financial td{padding:1.5mm 2.5mm;color:#626968}.financial td:last-child{text-align:right;color:#081d60;font-weight:bold;white-space:nowrap}.financial .divider td{padding:0;border-top:1px solid #d9dce5}.financial .total td{color:#081d60;font-size:10pt;font-weight:bold}.financial .balance td{color:#a07f31;font-size:10pt;font-weight:bold}.notes{margin-bottom:3mm;padding:3mm;border:1px solid #e1e3e9;background:#fcfcf8;page-break-inside:avoid}.notes h2{margin:0 0 .5mm;color:#081d60;font-size:9pt}.notes p{margin:0 0 1.5mm;color:#626968;white-space:pre-line;word-break:break-word}.footer{width:100%;border-collapse:collapse;border-top:1px solid #d9dce5;margin-top:4mm;page-break-inside:avoid}.footer td{padding-top:2mm;vertical-align:top;color:#626968;font-size:7.5pt}.footer strong{color:#081d60;font-size:8.5pt}.footer td:last-child{text-align:right}.no-print{margin:0 0 4mm;text-align:right}.no-print button{border:0;border-radius:4px;padding:10px 16px;background:#081d60;color:#fff;font:700 13px Arial;cursor:pointer}@media print{.no-print{display:none}.page{width:auto}.section,.financial,.notes,.footer{break-inside:avoid}}
</style></head><body><div class="page">'
            . ($autoPrint ? '<div class="no-print"><button type="button" onclick="window.print()">Print invoice</button></div>' : '')
            . '<table class="header"><tr><td width="58%">' . $logoHtml . '<div class="issuer-name">' . $this->e($issuer['name']) . '</div><div class="issuer-copy">' . $this->e($issuer['address']) . '<br><span dir="ltr">' . $this->e($issuer['phone']) . '</span><br><span dir="ltr">' . $this->e($issuer['email']) . '</span></div></td><td width="42%" class="document-mark"><span class="eyebrow">Invoice</span><h1 dir="ltr">' . $this->e($document['reference']) . '</h1><span class="badge">' . $this->e(str_replace('_', ' ', $document['status'])) . '</span></td></tr></table>'
            . '<div class="section"><h2 class="section-title">Invoice Summary</h2><table class="summary-grid"><tr><td><span class="section-kicker">Bill To</span><br><strong class="card-name" dir="auto">' . $this->e($document['customer']['name'] ?: '-') . '</strong>' . $this->optionalLines([$document['company_name'], $document['customer']['email'], $document['customer']['phone'], $document['customer']['address']]) . '</td><td><span class="section-kicker">Invoice Details</span>' . $this->detailsTable($document) . '</td></tr></table></div>'
            . '<div class="section"><h2 class="section-title">Services</h2><table class="services"><thead><tr><th width="14%">Service</th><th width="42%">Service name / details</th><th width="7%" style="text-align:right">Qty</th><th width="18%" style="text-align:right">Unit price</th><th width="19%" style="text-align:right">Line total</th></tr></thead><tbody>' . $items . '</tbody></table></div>'
            . '<div class="section"><h2 class="section-title">Financial Summary</h2><table class="financial"><tr><td>Subtotal</td><td>' . $this->money($document['subtotal'], $document['currency']) . '</td></tr><tr><td>Discount</td><td>- ' . $this->money($document['discount_amount'], $document['currency']) . '</td></tr><tr><td>Tax / VAT</td><td>+ ' . $this->money($document['tax_amount'], $document['currency']) . '</td></tr><tr class="divider"><td colspan="2"></td></tr><tr class="total"><td>Total</td><td>' . $this->money($document['total_amount'], $document['currency']) . '</td></tr><tr><td>Paid amount</td><td>' . $this->money($document['paid_amount'], $document['currency']) . '</td></tr><tr class="divider"><td colspan="2"></td></tr><tr class="balance"><td>Balance due</td><td>' . $this->money($document['balance_due'], $document['currency']) . '</td></tr></table></div>'
            . $this->notes($document)
            . '<table class="footer"><tr><td><strong>' . $this->e($issuer['name']) . '</strong><br>Travel operations, in one working system.</td><td><span dir="ltr">' . $this->e($issuer['phone']) . ' | ' . $this->e($issuer['email']) . '</span><br>' . $this->e($issuer['address']) . '</td></tr></table></div>' . $script . '</body></html>';
    }

    /** @param array<string, mixed> $document */
    private function detailsTable(array $document): string
    {
        $rows = array_filter([
            ['Reference', $document['reference']],
            ['Issue date', $document['issue_date'] ?: '-'],
            ['Due date', $document['due_date'] ?: '-'],
            ['Currency', $document['currency']],
            ['Sales owner', $document['sales_owner']],
            ['Contract', $document['contract_reference']],
            ['Active service', $document['active_service_reference']],
        ], fn (array $row) => filled($row[1]));

        $cells = collect($rows)->map(fn (array $row) => '<td><span class="section-kicker">' . $this->e($row[0]) . '</span><br><strong dir="auto">' . $this->e($row[1]) . '</strong></td>')->values();
        $html = '';
        foreach ($cells->chunk(2) as $chunk) {
            $html .= '<tr>' . $chunk->implode('') . ($chunk->count() === 1 ? '<td></td>' : '') . '</tr>';
        }

        return '<table class="details">' . $html . '</table>';
    }

    /** @param array<string, mixed> $item */
    private function itemRow(array $item, string $currency): string
    {
        $meta = array_filter([
            $item['booking_reference'] ? 'Ref: ' . $item['booking_reference'] : null,
            $this->dateRange($item['service_start_date'], $item['service_end_date']),
            $item['service_details'],
        ]);

        return '<tr><td><span class="service-name" dir="auto">' . $this->e($item['service']) . '</span></td><td><span class="service-name" dir="auto">' . $this->e($item['service_name']) . '</span><br><span class="muted" dir="auto">' . $this->e($item['description']) . '</span>' . ($meta ? '<br><span class="service-meta" dir="auto">' . $this->e(implode(' | ', $meta)) . '</span>' : '') . '</td><td class="num">' . $this->e($item['quantity']) . '</td><td class="num">' . $this->money($item['unit_price'], $currency) . '</td><td class="num">' . $this->money($item['line_total'], $currency) . '</td></tr>';
    }

    private function dateRange(?string $start, ?string $end): ?string
    {
        if (! $start && ! $end) {
            return null;
        }

        return ($start ?: '-') . ' to ' . ($end ?: '-');
    }

    /** @param array<string, mixed> $document */
    private function notes(array $document): string
    {
        $sections = array_filter([
            $document['notes'] ? '<h2>Notes</h2><p dir="auto">' . $this->lines($document['notes']) . '</p>' : null,
            $document['terms'] ? '<h2>Terms</h2><p dir="auto">' . $this->lines($document['terms']) . '</p>' : null,
        ]);

        return $sections ? '<div class="notes">' . implode('', $sections) . '</div>' : '';
    }

    /** @param array<int, mixed> $values */
    private function optionalLines(array $values): string
    {
        $lines = collect($values)->filter(fn ($value) => filled($value))->unique()->map(fn ($value) => '<span class="muted" dir="auto">' . $this->e($value) . '</span>')->implode('<br>');

        return $lines ? '<div>' . $lines . '</div>' : '';
    }

    /** @return array{name: string, address: string, phone: string, email: string} */
    private function issuer(): array
    {
        try {
            $settings = app(SettingsService::class)->getPublicSettings();
        } catch (\Throwable) {
            $settings = [];
        }

        $general = $settings['general'] ?? [];
        $contact = $settings['contact'] ?? [];

        return [
            'name' => trim((string) ($general['company_display_name'] ?? '')) ?: 'Legendary Management MEA',
            'address' => trim((string) ($contact['address_en'] ?? '')) ?: 'Riyadh, Saudi Arabia',
            'phone' => trim((string) ($contact['phone'] ?? '')) ?: trim((string) ($contact['whatsapp'] ?? '')) ?: '+966 53 314 4910',
            'email' => trim((string) ($contact['public_email'] ?? '')) ?: 'info@legendarymea.com',
        ];
    }

    private function money(mixed $amount, string $currency): string
    {
        return $this->e(strtoupper($currency) . ' ' . number_format((float) $amount, 2, '.', ','));
    }

    private function logoDataUri(): string
    {
        $path = public_path('legendary-management.png');
        if (! is_file($path) || ! is_readable($path)) {
            throw new \RuntimeException('Invoice logo asset is unavailable.');
        }

        return 'data:image/png;base64,' . base64_encode((string) file_get_contents($path));
    }

    private function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function lines(string $value): string
    {
        return nl2br($this->e($value), false);
    }
}

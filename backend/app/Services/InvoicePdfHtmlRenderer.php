<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;

class InvoicePdfHtmlRenderer
{
    public function render(Invoice $invoice, bool $autoPrint = false): string
    {
        $invoice->loadMissing(['company', 'customerUser', 'soldByEmployee.user', 'items.serviceCatalog', 'payments']);
        $settings = $this->publicSettings();
        $general = $settings['general'] ?? [];
        $contact = $settings['contact'] ?? [];
        $issuerName = trim((string) ($general['company_display_name'] ?? '')) ?: 'Legendary Management MEA';
        $issuerAddress = trim((string) ($contact['address_en'] ?? '')) ?: 'Riyadh, Saudi Arabia';
        $issuerPhone = trim((string) ($contact['phone'] ?? '')) ?: trim((string) ($contact['whatsapp'] ?? '')) ?: '+966 53 314 4910';
        $issuerEmail = trim((string) ($contact['public_email'] ?? '')) ?: 'info@legendarymea.com';
        $customerName = $invoice->billing_name ?: $invoice->company?->name ?: $invoice->customerUser?->name ?: '-';
        $customerEmail = $invoice->billing_email ?: $invoice->company?->email ?: $invoice->customerUser?->email;
        $customerPhone = $invoice->billing_phone ?: $invoice->company?->phone;
        $customerAddress = $invoice->billing_address ?: $invoice->company?->city;
        $logo = $this->logoDataUri();
        $logoHtml = $logo ? '<img src="' . $logo . '" alt="Legendary Management MEA" style="width:52mm;height:auto;">' : '<strong style="font-size:20px;color:#081d60;">LEGENDARY</strong>';
        $items = $invoice->items->map(fn (InvoiceItem $item, int $index) => $this->itemRow($invoice, $item, $index))->implode('');
        $notes = $this->notes($invoice);
        $script = $autoPrint ? '<script>window.addEventListener("load",function(){window.setTimeout(function(){window.print();},150);});</script>' : '';
        $pageStyle = $autoPrint ? '@page{size:A4;margin:12mm}' : '';

        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $this->e($invoice->reference) . '</title>
<style>' . $pageStyle . '
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#081d60;font-family:montserrat,montserratarabic,Arial,sans-serif;font-size:11px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%;margin:0 auto}.header{width:100%;border-collapse:collapse;border-bottom:1px solid #ddd7c8;margin-bottom:6mm}.header td{vertical-align:top;padding-bottom:5mm}.issuer{color:#667085;font-size:10px;line-height:1.55}.issuer strong{display:block;color:#081d60;font-size:13px;margin-top:2mm}.mark{text-align:right}.eyebrow,.label{color:#a07f31;font-weight:bold;text-transform:uppercase;letter-spacing:1px}.mark h1{margin:1mm 0 2mm;font-size:25px;line-height:1;color:#081d60}.badge{display:inline-block;padding:1.5mm 3mm;border-radius:10mm;background:#fbf0cf;color:#80631e;font-weight:bold;text-transform:capitalize}.parties{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:5mm}.parties td{width:50%;vertical-align:top;border:1px solid #e4dfd4;background:#fbfaf7;padding:4mm}.parties td+td{border-left:3mm solid #fff}.party-name{display:block;margin:1mm 0;color:#081d60;font-size:14px}.muted{color:#667085}.meta{width:100%;border-collapse:collapse;margin-bottom:5mm}.meta td{width:25%;padding:2.5mm 2mm;border-bottom:1px solid #eee9de;vertical-align:top}.meta strong{display:block;margin-top:1mm;color:#081d60}.items{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:5mm}.items th{padding:2.5mm 2mm;background:#081d60;color:#fff;text-align:left;font-size:9px}.items td{padding:3mm 2mm;border-bottom:1px solid #e8e3d8;vertical-align:top;overflow-wrap:anywhere}.items .num{text-align:right;white-space:nowrap}.service{display:block;font-weight:bold}.details{display:block;color:#667085;font-size:9px;margin-top:1mm}.summary{width:78mm;margin-left:auto;border-collapse:collapse;background:#fbfaf7;border:1px solid #e1dbc9}.summary td{padding:2mm 3mm}.summary td:last-child{text-align:right;font-weight:bold;white-space:nowrap}.summary .total td{border-top:1px solid #cfc6ae;color:#081d60;font-size:13px;font-weight:bold}.summary .balance td{color:#a07f31;font-size:12px;font-weight:bold}.notes{margin-top:5mm;padding:4mm;border:1px solid #e4dfd4;background:#fcfcf8;page-break-inside:avoid}.notes h2{margin:0 0 2mm;color:#081d60;font-size:12px}.notes p{margin:1mm 0;color:#4f565d;white-space:pre-line}.footer{width:100%;border-collapse:collapse;border-top:1px solid #ddd7c8;margin-top:7mm}.footer td{padding-top:3mm;vertical-align:top;color:#667085;font-size:9px}.footer td:last-child{text-align:right}.no-print{margin:0 0 5mm;text-align:right}.no-print button{border:0;border-radius:4px;padding:10px 16px;background:#081d60;color:#fff;font:700 13px Arial;cursor:pointer}@media print{.no-print{display:none}.page{width:auto}.items tr,.notes,.summary{page-break-inside:avoid}}
</style></head><body><div class="page">'
            . ($autoPrint ? '<div class="no-print"><button type="button" onclick="window.print()">Print invoice</button></div>' : '')
            . '<table class="header"><tr><td width="58%">' . $logoHtml . '<div class="issuer"><strong>' . $this->e($issuerName) . '</strong>' . $this->e($issuerAddress) . '<br><span dir="ltr">' . $this->e($issuerPhone) . '</span><br><span dir="ltr">' . $this->e($issuerEmail) . '</span></div></td><td width="42%" class="mark"><span class="eyebrow">Invoice</span><h1 dir="ltr">' . $this->e($invoice->reference) . '</h1><span class="badge">' . $this->e(str_replace('_', ' ', $invoice->status->value)) . '</span></td></tr></table>'
            . '<table class="parties"><tr><td><span class="label">Bill to</span><br><strong class="party-name" dir="auto">' . $this->e($customerName) . '</strong>' . $this->optionalLines([$customerEmail, $customerPhone, $customerAddress]) . '</td><td><span class="label">Invoice details</span><br><strong class="party-name">' . $this->e($invoice->currency) . '</strong><span class="muted">' . $this->e($invoice->contract?->reference ?? $invoice->activeService?->reference ?? '') . '</span></td></tr></table>'
            . '<table class="meta"><tr><td><span class="label">Issue date</span><br><strong dir="ltr">' . $this->e($invoice->issue_date?->format('Y-m-d') ?? '-') . '</strong></td><td><span class="label">Due date</span><br><strong dir="ltr">' . $this->e($invoice->due_date?->format('Y-m-d') ?? '-') . '</strong></td><td><span class="label">Currency</span><br><strong>' . $this->e($invoice->currency) . '</strong></td><td><span class="label">Payment status</span><br><strong>' . $this->e(str_replace('_', ' ', $invoice->status->value)) . '</strong></td></tr></table>'
            . '<table class="items"><thead><tr><th width="18%">Service</th><th width="36%">Description</th><th width="10%" style="text-align:right">Qty</th><th width="17%" style="text-align:right">Unit price</th><th width="19%" style="text-align:right">Line total</th></tr></thead><tbody>' . $items . '</tbody></table>'
            . '<table class="summary"><tr><td>Subtotal</td><td>' . $this->money($invoice->subtotal, $invoice->currency) . '</td></tr><tr><td>Discount</td><td>- ' . $this->money($invoice->discount_amount, $invoice->currency) . '</td></tr><tr><td>Tax / VAT</td><td>+ ' . $this->money($invoice->tax_amount, $invoice->currency) . '</td></tr><tr class="total"><td>Total</td><td>' . $this->money($invoice->total_amount, $invoice->currency) . '</td></tr><tr><td>Paid</td><td>' . $this->money($invoice->postedPaymentsTotal(), $invoice->currency) . '</td></tr><tr class="balance"><td>Balance due</td><td>' . $this->money($invoice->balanceDue(), $invoice->currency) . '</td></tr></table>'
            . $notes
            . '<table class="footer"><tr><td><strong>' . $this->e($issuerName) . '</strong><br>Travel operations, in one working system.</td><td><span dir="ltr">' . $this->e($issuerPhone) . ' | ' . $this->e($issuerEmail) . '</span><br>' . $this->e($issuerAddress) . '</td></tr></table></div>' . $script . '</body></html>';
    }

    private function itemRow(Invoice $invoice, InvoiceItem $item, int $index): string
    {
        $service = $item->service_name_snapshot ?: $item->serviceCatalog?->name_en ?: 'Service ' . ($index + 1);
        $details = array_filter([
            $item->booking_reference ? 'Ref: ' . $item->booking_reference : null,
            $item->service_start_date ? $item->service_start_date->format('Y-m-d') : null,
            $item->service_end_date ? $item->service_end_date->format('Y-m-d') : null,
            $item->service_details,
        ]);

        return '<tr><td><span class="service" dir="auto">' . $this->e($service) . '</span>' . ($details ? '<br><span class="details" dir="auto">' . $this->e(implode(' | ', $details)) . '</span>' : '') . '</td><td dir="auto">' . $this->e($item->description) . '</td><td class="num">' . $this->e($item->quantity) . '</td><td class="num">' . $this->money($item->unit_price, $invoice->currency) . '</td><td class="num">' . $this->money($item->line_total, $invoice->currency) . '</td></tr>';
    }

    private function notes(Invoice $invoice): string
    {
        $sections = array_filter([
            $invoice->notes ? '<h2>Notes</h2><p dir="auto">' . $this->lines($invoice->notes) . '</p>' : null,
            $invoice->terms ? '<h2>Terms</h2><p dir="auto">' . $this->lines($invoice->terms) . '</p>' : null,
        ]);

        return $sections ? '<div class="notes">' . implode('', $sections) . '</div>' : '';
    }

    private function optionalLines(array $values): string
    {
        $lines = collect($values)->filter(fn ($value) => filled($value))->map(fn ($value) => '<span class="muted" dir="auto">' . $this->e($value) . '</span>')->implode('<br>');

        return $lines ? '<div>' . $lines . '</div>' : '';
    }

    private function money(mixed $amount, string $currency): string
    {
        return $this->e(strtoupper($currency) . ' ' . number_format((float) $amount, 2, '.', ','));
    }

    private function logoDataUri(): ?string
    {
        $path = base_path('../frontend/public/legendary-management.png');
        if (! is_file($path)) {
            return null;
        }

        return 'data:image/png;base64,' . base64_encode((string) file_get_contents($path));
    }

    private function publicSettings(): array
    {
        try {
            return app(SettingsService::class)->getPublicSettings();
        } catch (\Throwable) {
            return [];
        }
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

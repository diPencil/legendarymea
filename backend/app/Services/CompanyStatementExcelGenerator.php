<?php

namespace App\Services;

use App\Models\Company;
use App\Support\Money;
use Carbon\Carbon;
use ZipArchive;
use RuntimeException;

class CompanyStatementExcelGenerator
{
    public function __construct(
        private readonly CompanyStatementService $statementService
    ) {}

    public function generate(Company $company, array $filters): InvoicePdfFile
    {
        // Enforce complete unpaginated dataset
        $statementFilters = array_merge($filters, ['all' => true, 'per_page' => 1000]);
        $statement = $this->statementService->getStatement($company, $statementFilters);

        $currency = $statement['currency'];
        $decimals = Money::precision($currency);
        $numStyleIndex = $decimals === 3 ? 5 : 4;

        $startDate = $statement['period']['start_date'];
        $endDate = $statement['period']['end_date'];
        $filename = "statement-{$company->reference}-{$currency}-{$startDate}-to-{$endDate}.xlsx";

        $tempPath = tempnam(sys_get_temp_dir(), 'soa_xlsx_');
        $zip = new ZipArchive();
        if ($zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create temporary Excel spreadsheet.');
        }

        $zip->addFromString('[Content_Types].xml', $this->getContentTypesXml());
        $zip->addFromString('_rels/.rels', $this->getRootRelsXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->getWorkbookRelsXml());
        $zip->addFromString('xl/workbook.xml', $this->getWorkbookXml());
        $zip->addFromString('xl/styles.xml', $this->getStylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->buildSheetXml($statement, $numStyleIndex));

        $zip->close();

        $content = file_get_contents($tempPath);
        @unlink($tempPath);

        return new InvoicePdfFile($filename, $content);
    }

    private function buildSheetXml(array $statement, int $numStyleIndex): string
    {
        $company = $statement['company'];
        $summary = $statement['summary'];
        $currency = $statement['currency'];
        $transactions = $statement['transactions']['data'] ?? [];
        $activeInvoices = $statement['supporting_schedules']['active_invoices'] ?? [];

        $xml = [];
        $xml[] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $xml[] = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        $xml[] = '<cols>';
        $xml[] = '<col min="1" max="1" width="14" customWidth="1"/>';
        $xml[] = '<col min="2" max="2" width="18" customWidth="1"/>';
        $xml[] = '<col min="3" max="3" width="18" customWidth="1"/>';
        $xml[] = '<col min="4" max="4" width="38" customWidth="1"/>';
        $xml[] = '<col min="5" max="5" width="16" customWidth="1"/>';
        $xml[] = '<col min="6" max="6" width="16" customWidth="1"/>';
        $xml[] = '<col min="7" max="7" width="20" customWidth="1"/>';
        $xml[] = '<col min="8" max="8" width="16" customWidth="1"/>';
        $xml[] = '<col min="9" max="9" width="16" customWidth="1"/>';
        $xml[] = '<col min="10" max="10" width="18" customWidth="1"/>';
        $xml[] = '</cols>';
        $xml[] = '<sheetData>';

        $rowNum = 1;

        // Header block
        $xml[] = $this->row($rowNum++, [
            ['A', 'LEGENDARY MANAGEMENT MEA - STATEMENT OF ACCOUNT', 1],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', "Company: {$company['name']} ({$company['reference']})", 6],
            ['G', "Currency: {$currency}", 6],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', "Period: {$statement['period']['start_date']} to {$statement['period']['end_date']}", 6],
            ['G', "Generated: " . Carbon::now('UTC')->toIso8601String(), 6],
        ]);
        $rowNum++; // Blank row

        // Summary KPI Block
        $xml[] = $this->row($rowNum++, [
            ['A', 'FINANCIAL SUMMARY', 2],
            ['B', 'RECEIVABLES (+)', 2],
            ['C', 'UNALLOCATED CREDIT (-)', 2],
            ['D', 'NET POSITION', 2],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Opening Balance', 3],
            ['B', (float) $summary['opening_balance']['receivables'], $numStyleIndex],
            ['C', (float) $summary['opening_balance']['unallocated_credit'], $numStyleIndex],
            ['D', (float) $summary['opening_balance']['net_position'], $numStyleIndex],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Period Movements', 3],
            ['B', (float) $summary['period_movements']['invoiced_total'], $numStyleIndex],
            ['C', (float) $summary['period_movements']['payments_received'], $numStyleIndex],
            ['D', (float) $summary['period_movements']['net_change'], $numStyleIndex],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Closing Balance', 6],
            ['B', (float) $summary['closing_balance']['receivables'], $numStyleIndex],
            ['C', (float) $summary['closing_balance']['unallocated_credit'], $numStyleIndex],
            ['D', (float) $summary['closing_balance']['net_position'], $numStyleIndex],
        ]);
        $rowNum++; // Blank row

        // Transactions Header
        $xml[] = $this->row($rowNum++, [
            ['A', 'Date', 2],
            ['B', 'Type', 2],
            ['C', 'Reference', 2],
            ['D', 'Description', 2],
            ['E', 'Invoice Ref', 2],
            ['F', 'Payment Ref', 2],
            ['G', 'Booking Ref', 2],
            ['H', "Debit ({$currency})", 2],
            ['I', "Credit ({$currency})", 2],
            ['J', "Running Balance ({$currency})", 2],
        ]);

        foreach ($transactions as $tx) {
            $date = Carbon::parse($tx['date'])->format('Y-m-d');
            $bookings = !empty($tx['booking_references']) ? implode(', ', $tx['booking_references']) : '';
            $debitVal = (float) $tx['debit'] > 0 ? (float) $tx['debit'] : '';
            $creditVal = (float) $tx['credit'] > 0 ? (float) $tx['credit'] : '';
            $balanceVal = (float) $tx['running_balance'];

            $cells = [
                ['A', $date, 3],
                ['B', $tx['type_label'], 3],
                ['C', $tx['reference'], 3],
                ['D', $tx['description'], 3],
                ['E', $tx['invoice_reference'] ?? '', 3],
                ['F', $tx['payment_reference'] ?? '', 3],
                ['G', $bookings, 3],
                ['H', $debitVal !== '' ? $debitVal : '', $debitVal !== '' ? $numStyleIndex : 3],
                ['I', $creditVal !== '' ? $creditVal : '', $creditVal !== '' ? $numStyleIndex : 3],
                ['J', $balanceVal, $numStyleIndex],
            ];
            $xml[] = $this->row($rowNum++, $cells);
        }

        // Active Invoices Schedule if any
        if (!empty($activeInvoices)) {
            $rowNum++; // blank
            $xml[] = $this->row($rowNum++, [
                ['A', 'OUTSTANDING ACTIVE INVOICES SCHEDULE', 2],
                ['B', 'Issue Date', 2],
                ['C', 'Due Date', 2],
                ['D', 'Status', 2],
                ['E', 'Booking Ref', 2],
                ['F', "Total Amount ({$currency})", 2],
                ['G', "Balance Due ({$currency})", 2],
            ]);

            foreach ($activeInvoices as $inv) {
                $bookings = !empty($inv['booking_references']) ? implode(', ', $inv['booking_references']) : '';
                $xml[] = $this->row($rowNum++, [
                    ['A', $inv['reference'], 3],
                    ['B', $inv['issue_date'], 3],
                    ['C', $inv['due_date'] ?? '', 3],
                    ['D', ucfirst(str_replace('_', ' ', $inv['status'])), 3],
                    ['E', $bookings, 3],
                    ['F', (float) $inv['total_amount'], $numStyleIndex],
                    ['G', (float) $inv['balance_due'], $numStyleIndex],
                ]);
            }
        }

        $xml[] = '</sheetData>';
        $xml[] = '</worksheet>';

        return implode('', $xml);
    }

    private function row(int $rowNum, array $cells): string
    {
        $out = "<row r=\"{$rowNum}\">";
        foreach ($cells as $cell) {
            $col = $cell[0];
            $val = $cell[1];
            $style = $cell[2] ?? 0;
            $ref = "{$col}{$rowNum}";

            if (is_numeric($val) && $val !== '') {
                $out .= "<c r=\"{$ref}\" s=\"{$style}\"><v>{$val}</v></c>";
            } else {
                $escaped = htmlspecialchars((string) $val, ENT_XML1 | ENT_COMPAT, 'UTF-8');
                $out .= "<c r=\"{$ref}\" s=\"{$style}\" t=\"inlineStr\"><is><t>{$escaped}</t></is></c>";
            }
        }
        $out .= '</row>';
        return $out;
    }

    private function getContentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function getRootRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function getWorkbookRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    private function getWorkbookXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets>'
            . '<sheet name="Statement of Account" sheetId="1" r:id="rId1"/>'
            . '</sheets>'
            . '</workbook>';
    }

    private function getStylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<numFmts count="2">'
            . '<numFmt numFmtId="164" formatCode="#,##0.00"/>'
            . '<numFmt numFmtId="165" formatCode="#,##0.000"/>'
            . '</numFmts>'
            . '<fonts count="4">'
            . '<font><sz val="10"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="10"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="13"/><color rgb="FF081D60"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
            . '</fonts>'
            . '<fills count="4">'
            . '<fill><patternFill patternType="none"/></fill>'
            . '<fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FF081D60"/></patternFill></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFFCFCF8"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="2">'
            . '<border><left/><right/><top/><bottom/></border>'
            . '<border><left style="thin"><color rgb="FFD9DCE5"/></left><right style="thin"><color rgb="FFD9DCE5"/></right><top style="thin"><color rgb="FFD9DCE5"/></top><bottom style="thin"><color rgb="FFD9DCE5"/></bottom></border>'
            . '</borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="7">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' // 0: Normal
            . '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>' // 1: Title
            . '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>' // 2: Header Navy
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>' // 3: Normal Bordered
            . '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' // 4: 2 Decimals
            . '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' // 5: 3 Decimals
            . '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0"/>' // 6: Highlight Row
            . '</cellXfs>'
            . '</styleSheet>';
    }
}

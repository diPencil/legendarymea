<?php

namespace App\Services;

use App\Models\Supplier;
use App\Support\Money;
use Carbon\Carbon;
use ZipArchive;
use RuntimeException;

class SupplierStatementExcelGenerator
{
    public function __construct(
        private readonly SupplierStatementService $statementService
    ) {}

    public function generate(Supplier $supplier, array $filters): InvoicePdfFile
    {
        // Enforce complete unpaginated dataset
        $statementFilters = array_merge($filters, ['all' => true, 'per_page' => 1000]);
        $statement = $this->statementService->getStatement($supplier, $statementFilters);

        $currency = $statement['currency'];
        $decimals = Money::precision($currency);
        $numStyleIndex = $decimals === 3 ? 5 : 4;

        $startDate = $statement['period']['start_date'];
        $endDate = $statement['period']['end_date'];
        $filename = "supplier-statement-{$supplier->reference}-{$currency}-{$startDate}-to-{$endDate}.xlsx";

        $tempPath = tempnam(sys_get_temp_dir(), 'sup_soa_xlsx_');
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
        $supplier = $statement['supplier'];
        $summary = $statement['summary'];
        $currency = $statement['currency'];
        $transactions = $statement['transactions']['data'] ?? [];
        $fundingSchedule = $statement['supporting_schedules']['funding_schedule'] ?? [];
        $usageSchedule = $statement['supporting_schedules']['invoice_usage_schedule'] ?? [];

        $xml = [];
        $xml[] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        $xml[] = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        $xml[] = '<cols>';
        $xml[] = '<col min="1" max="1" width="14" customWidth="1"/>';
        $xml[] = '<col min="2" max="2" width="18" customWidth="1"/>';
        $xml[] = '<col min="3" max="3" width="18" customWidth="1"/>';
        $xml[] = '<col min="4" max="4" width="38" customWidth="1"/>';
        $xml[] = '<col min="5" max="5" width="18" customWidth="1"/>';
        $xml[] = '<col min="6" max="6" width="18" customWidth="1"/>';
        $xml[] = '<col min="7" max="7" width="18" customWidth="1"/>';
        $xml[] = '<col min="8" max="8" width="16" customWidth="1"/>';
        $xml[] = '<col min="9" max="9" width="16" customWidth="1"/>';
        $xml[] = '<col min="10" max="10" width="20" customWidth="1"/>';
        $xml[] = '</cols>';
        $xml[] = '<sheetData>';

        $rowNum = 1;

        // Header block
        $xml[] = $this->row($rowNum++, [
            ['A', 'LEGENDARY MANAGEMENT MEA - SUPPLIER STATEMENT OF ACCOUNT', 1],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', "Supplier: {$supplier['name']} ({$supplier['reference']})", 6],
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
            ['B', 'BALANCE', 2],
            ['C', 'AVAILABLE FUNDS (+)', 2],
            ['D', 'AMOUNT OWED (-)', 2],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Opening Balance', 3],
            ['B', (float) $summary['opening_balance']['balance'], $numStyleIndex],
            ['C', (float) $summary['opening_balance']['available_funds'], $numStyleIndex],
            ['D', (float) $summary['opening_balance']['amount_owed'], $numStyleIndex],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Period Movements', 3],
            ['B', (float) $summary['period_movements']['net_movement'], $numStyleIndex],
            ['C', (float) $summary['period_movements']['funding_total'], $numStyleIndex],
            ['D', (float) $summary['period_movements']['usage_total'], $numStyleIndex],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Closing Balance', 6],
            ['B', (float) $summary['closing_balance']['balance'], $numStyleIndex],
            ['C', (float) $summary['closing_balance']['available_funds'], $numStyleIndex],
            ['D', (float) $summary['closing_balance']['amount_owed'], $numStyleIndex],
        ]);
        $xml[] = $this->row($rowNum++, [
            ['A', 'Reconciliation Status', 3],
            ['B', $summary['reconciliation']['is_reconciled'] ? 'RECONCILED' : 'DISCREPANCY DETECTED', 3],
            ['C', "Stored: " . $summary['reconciliation']['account_current_balance'], 3],
            ['D', "Discrepancy: " . $summary['reconciliation']['discrepancy'], 3],
        ]);
        $rowNum++; // Blank row

        // Transactions Header
        $xml[] = $this->row($rowNum++, [
            ['A', 'Date', 2],
            ['B', 'Type', 2],
            ['C', 'Reference', 2],
            ['D', 'Description', 2],
            ['E', 'Invoice Ref', 2],
            ['F', 'Booking Ref', 2],
            ['G', 'External / Wire Ref', 2],
            ['H', "Debit (-) [{$currency}]", 2],
            ['I', "Credit (+) [{$currency}]", 2],
            ['J', "Running Balance [{$currency}]", 2],
        ]);

        foreach ($transactions as $tx) {
            $date = Carbon::parse($tx['date'])->format('Y-m-d');
            $debitVal = (float) $tx['debit'] > 0 ? (float) $tx['debit'] : '';
            $creditVal = (float) $tx['credit'] > 0 ? (float) $tx['credit'] : '';
            $balanceVal = (float) $tx['running_balance'];

            $cells = [
                ['A', $date, 3],
                ['B', $tx['type_label'], 3],
                ['C', $tx['reference'], 3],
                ['D', $tx['description'], 3],
                ['E', $tx['invoice_reference'] ?? '', 3],
                ['F', $tx['booking_reference'] ?? '', 3],
                ['G', $tx['external_reference'] ?? '', 3],
                ['H', $debitVal !== '' ? $debitVal : '', $debitVal !== '' ? $numStyleIndex : 3],
                ['I', $creditVal !== '' ? $creditVal : '', $creditVal !== '' ? $numStyleIndex : 3],
                ['J', $balanceVal, $numStyleIndex],
            ];
            $xml[] = $this->row($rowNum++, $cells);
        }

        // Supporting Schedule: Funding Deposits
        if (!empty($fundingSchedule)) {
            $rowNum++; // blank
            $xml[] = $this->row($rowNum++, [
                ['A', 'SUPPLIER FUNDING SCHEDULE (ADVANCE DEPOSITS)', 2],
                ['B', 'Date', 2],
                ['C', 'Payment Method', 2],
                ['D', 'External / Wire Reference', 2],
                ['E', "Amount ({$currency})", 2],
                ['F', 'Notes', 2],
            ]);

            foreach ($fundingSchedule as $f) {
                $xml[] = $this->row($rowNum++, [
                    ['A', $f['ledger_reference'], 3],
                    ['B', $f['transaction_date'], 3],
                    ['C', ucfirst(str_replace('_', ' ', $f['payment_method'] ?? '-')), 3],
                    ['D', $f['external_reference'] ?? '', 3],
                    ['E', (float) $f['amount'], $numStyleIndex],
                    ['F', $f['notes'] ?? '', 3],
                ]);
            }
        }

        // Supporting Schedule: Invoice Service Usage
        if (!empty($usageSchedule)) {
            $rowNum++; // blank
            $xml[] = $this->row($rowNum++, [
                ['A', 'SUPPLIER SERVICE USAGE SCHEDULE', 2],
                ['B', 'Date', 2],
                ['C', 'Booking Ref', 2],
                ['D', 'Service Item', 2],
                ['E', 'Quantity', 2],
                ['F', "Unit Cost ({$currency})", 2],
                ['G', "Total Consumed ({$currency})", 2],
                ['H', 'Reversal Status', 2],
            ]);

            foreach ($usageSchedule as $u) {
                $xml[] = $this->row($rowNum++, [
                    ['A', $u['invoice_reference'] ?? '-', 3],
                    ['B', $u['transaction_date'], 3],
                    ['C', $u['booking_reference'] ?? '', 3],
                    ['D', $u['service_description'], 3],
                    ['E', $u['quantity'] ? (float) $u['quantity'] : 1, 3],
                    ['F', $u['unit_cost'] ? (float) $u['unit_cost'] : 0, $numStyleIndex],
                    ['G', (float) $u['total_cost'], $numStyleIndex],
                    ['H', !empty($u['is_reversed']) ? 'REVERSED (' . ($u['reversal_reference'] ?? '') . ')' : 'ACTIVE', 3],
                ]);
            }
        }

        $xml[] = '</sheetData>';
        $xml[] = '</worksheet>';

        return implode('', $xml);
    }

    private function row(int $rowNum, array $cells): string
    {
        $out = '<row r="' . $rowNum . '">';
        foreach ($cells as $cell) {
            $col = $cell[0];
            $val = $cell[1];
            $style = $cell[2] ?? 0;
            $ref = $col . $rowNum;

            if (is_numeric($val) && $style >= 4) {
                $out .= '<c r="' . $ref . '" s="' . $style . '"><v>' . $val . '</v></c>';
            } else {
                $escaped = htmlspecialchars((string) $val, ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $out .= '<c r="' . $ref . '" s="' . $style . '" t="inlineStr"><is><t>' . $escaped . '</t></is></c>';
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
            . '<sheet name="Supplier Statement" sheetId="1" r:id="rId1"/>'
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
            . '<font><sz val="10"/><name val="Segoe UI"/></font>'
            . '<font><b/><sz val="14"/><color rgb="FF081D60"/><name val="Segoe UI"/></font>'
            . '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>'
            . '<font><b/><sz val="10"/><color rgb="FF081D60"/><name val="Segoe UI"/></font>'
            . '</fonts>'
            . '<fills count="4">'
            . '<fill><patternFill patternType="none"/></fill>'
            . '<fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FF081D60"/></patternFill></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFFCFCF8"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="2">'
            . '<border><left/><right/><top/><bottom/></border>'
            . '<border><bottom style="thin"><color rgb="FFD0D4DC"/></bottom></border>'
            . '</borders>'
            . '<cellXfs count="7">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>'
            . '<xf numFmtId="0" fontId="1" fillId="0" borderId="0"/>'
            . '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" applyFont="1" applyFill="1"/>'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>'
            . '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>'
            . '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>'
            . '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>'
            . '</cellXfs>'
            . '</styleSheet>';
    }
}

<?php

namespace App\Enums;

enum SupplierLedgerType: string
{
    case FUNDING = 'funding';
    case ADJUSTMENT = 'adjustment';
    case INVOICE_USAGE = 'invoice_usage';
    case REVERSAL = 'reversal';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

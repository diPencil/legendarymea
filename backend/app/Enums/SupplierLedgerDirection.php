<?php

namespace App\Enums;

enum SupplierLedgerDirection: string
{
    case CREDIT = 'credit';
    case DEBIT = 'debit';
}

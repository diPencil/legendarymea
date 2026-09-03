<?php

namespace App\Enums;

enum InvoiceCustomerType: string
{
    case COMPANY = 'company';
    case USER = 'user';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

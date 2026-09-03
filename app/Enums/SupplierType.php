<?php

namespace App\Enums;

enum SupplierType: string
{
    case USER = 'user';
    case COMPANY = 'company';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

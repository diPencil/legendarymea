<?php

namespace App\Enums;

enum CurrencyCode: string
{
    case AED = 'AED';
    case SAR = 'SAR';
    case USD = 'USD';
    case EUR = 'EUR';
    case GBP = 'GBP';
    case KWD = 'KWD';
    case BHD = 'BHD';
    case QAR = 'QAR';
    case OMR = 'OMR';
    case EGP = 'EGP';
    case JOD = 'JOD';
    case LBP = 'LBP';
    case MAD = 'MAD';
    case TND = 'TND';
    case DZD = 'DZD';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

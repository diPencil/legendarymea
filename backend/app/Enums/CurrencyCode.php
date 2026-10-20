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

    public function minorUnits(): int
    {
        return match ($this) {
            self::KWD, self::BHD, self::JOD, self::OMR, self::TND => 3,
            default => 2,
        };
    }

    public static function precision(string $currency): int
    {
        return self::tryFrom(strtoupper($currency))?->minorUnits() ?? 2;
    }

    public static function precisionMap(): array
    {
        return array_column(
            array_map(fn (self $currency) => [
                'currency' => $currency->value,
                'precision' => $currency->minorUnits(),
            ], self::cases()),
            'precision',
            'currency'
        );
    }
}

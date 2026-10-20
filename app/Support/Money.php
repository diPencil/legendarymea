<?php

namespace App\Support;

use App\Enums\CurrencyCode;

final class Money
{
    public static function precision(string $currency): int
    {
        return CurrencyCode::precision($currency);
    }

    public static function normalize(mixed $amount, string $currency): string
    {
        return Decimal::normalize($amount, self::precision($currency));
    }

    public static function add(mixed $left, mixed $right, string $currency): string
    {
        return Decimal::add($left, $right, self::precision($currency));
    }

    public static function subtract(mixed $left, mixed $right, string $currency): string
    {
        return Decimal::subtract($left, $right, self::precision($currency));
    }

    public static function multiply(mixed $left, mixed $right, string $currency): string
    {
        return Decimal::multiply($left, $right, self::precision($currency));
    }

    public static function compare(mixed $left, mixed $right): int
    {
        return Decimal::compare($left, $right);
    }

    public static function hasValidPrecision(mixed $amount, string $currency): bool
    {
        return Decimal::hasAtMostScale($amount, self::precision($currency));
    }

    public static function toMinorUnits(mixed $amount, string $currency): int
    {
        return Decimal::toMinorUnits($amount, self::precision($currency));
    }

    public static function fromMinorUnits(int $value, string $currency): string
    {
        return Decimal::fromMinorUnits($value, self::precision($currency));
    }
}

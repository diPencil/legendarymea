<?php

namespace App\Support;

use Brick\Math\BigDecimal;
use Brick\Math\BigInteger;
use Brick\Math\RoundingMode;

final class Decimal
{
    public static function normalize(mixed $value, int $scale): string
    {
        return self::of($value)->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function add(mixed $left, mixed $right, int $scale): string
    {
        return self::of($left)->plus(self::of($right))->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function subtract(mixed $left, mixed $right, int $scale): string
    {
        return self::of($left)->minus(self::of($right))->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function multiply(mixed $left, mixed $right, int $scale): string
    {
        return self::of($left)->multipliedBy(self::of($right))->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function divide(mixed $left, mixed $right, int $scale): string
    {
        return self::of($left)->dividedBy(self::of($right), $scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function compare(mixed $left, mixed $right): int
    {
        return self::of($left)->compareTo(self::of($right));
    }

    public static function absolute(mixed $value, int $scale): string
    {
        return self::of($value)->abs()->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function negate(mixed $value, int $scale): string
    {
        return self::of($value)->negated()->toScale($scale, RoundingMode::HALF_UP)->__toString();
    }

    public static function hasAtMostScale(mixed $value, int $scale): bool
    {
        try {
            return self::of($value)->stripTrailingZeros()->getScale() <= $scale;
        } catch (\Throwable) {
            return false;
        }
    }

    public static function toMinorUnits(mixed $value, int $scale): int
    {
        $minorUnits = self::of($value)
            ->multipliedBy(BigInteger::of(10)->power($scale))
            ->toScale(0, RoundingMode::UNNECESSARY)
            ->toBigInteger();

        return $minorUnits->toInt();
    }

    public static function fromMinorUnits(int $value, int $scale): string
    {
        return BigDecimal::ofUnscaledValue($value, $scale)->__toString();
    }

    private static function of(mixed $value): BigDecimal
    {
        if ($value === null || $value === '') {
            return BigDecimal::zero();
        }

        if (is_float($value)) {
            $value = sprintf('%.14F', $value);
        }

        return BigDecimal::of((string) $value);
    }
}

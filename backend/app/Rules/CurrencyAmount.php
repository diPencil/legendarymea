<?php

namespace App\Rules;

use App\Support\Money;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class CurrencyAmount implements ValidationRule
{
    public function __construct(private readonly string|Closure $currency) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $currency = strtoupper((string) ($this->currency instanceof Closure
            ? ($this->currency)($attribute)
            : $this->currency));

        if (!Money::hasValidPrecision($value, $currency)) {
            $fail("The :attribute field may have at most " . Money::precision($currency) . " decimal places for {$currency}.");
        }
    }
}

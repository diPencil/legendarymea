<?php

namespace App\Rules;

use App\Support\Decimal;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class DecimalScale implements ValidationRule
{
    public function __construct(private readonly int $scale) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!Decimal::hasAtMostScale($value, $this->scale)) {
            $fail("The :attribute field may have at most {$this->scale} decimal places.");
        }
    }
}

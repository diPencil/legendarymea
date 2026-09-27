<?php

namespace App\Services;

class InvoicePdfFile
{
    public function __construct(
        public readonly string $filename,
        public readonly string $contents,
    ) {}
}

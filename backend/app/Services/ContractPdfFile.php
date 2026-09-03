<?php

namespace App\Services;

class ContractPdfFile
{
    public function __construct(
        public readonly string $filename,
        public readonly string $contents,
    ) {}
}

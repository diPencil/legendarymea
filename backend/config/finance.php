<?php

use App\Enums\CurrencyCode;
use App\Enums\ServiceInterest;

return [
    'supported_currencies' => CurrencyCode::values(),
    'invoice_service_types' => ServiceInterest::values(),
];

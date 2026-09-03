<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case BANK_TRANSFER = 'bank_transfer';
    case CASH = 'cash';
    case CARD = 'card';
    case GATEWAY = 'gateway';
    case OTHER = 'other';
}

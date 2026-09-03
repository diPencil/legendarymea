<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case POSTED = 'posted';
    case REVERSED = 'reversed';
}

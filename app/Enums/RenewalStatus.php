<?php

namespace App\Enums;

enum RenewalStatus: string
{
    case UPCOMING = 'upcoming';
    case DUE = 'due';
    case COMPLETED = 'completed';
    case DECLINED = 'declined';
    case CANCELLED = 'cancelled';
}

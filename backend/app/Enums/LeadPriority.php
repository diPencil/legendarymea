<?php

namespace App\Enums;

enum LeadPriority: string
{
    case LOW = 'low';
    case NORMAL = 'normal';
    case HIGH = 'high';
    case URGENT = 'urgent';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

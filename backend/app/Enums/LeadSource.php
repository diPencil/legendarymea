<?php

namespace App\Enums;

enum LeadSource: string
{
    case WEBSITE = 'website';
    case SALES_OUTREACH = 'sales_outreach';
    case EMAIL = 'email';
    case REFERRAL = 'referral';
    case PARTNER = 'partner';
    case MANUAL = 'manual';
    case OTHER = 'other';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

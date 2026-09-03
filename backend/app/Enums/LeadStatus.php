<?php

namespace App\Enums;

enum LeadStatus: string
{
    case NEW = 'new';
    case CONTACTED = 'contacted';
    case QUALIFIED = 'qualified';
    case UNQUALIFIED = 'unqualified';
    case CONVERTED = 'converted';
    case LOST = 'lost';
}

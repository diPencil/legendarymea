<?php

namespace App\Enums;

enum ActiveServiceStatus: string
{
    case DRAFT = 'draft';
    case ACTIVE = 'active';
    case SUSPENDED = 'suspended';
    case ENDED = 'ended';
    case CANCELLED = 'cancelled';
}

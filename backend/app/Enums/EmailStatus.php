<?php

namespace App\Enums;

enum EmailStatus: string
{
    case DRAFT = 'draft';
    case SENT = 'sent';
    case FAILED = 'failed';
    case CANCELLED = 'cancelled';
}

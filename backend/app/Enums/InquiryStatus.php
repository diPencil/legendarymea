<?php

namespace App\Enums;

enum InquiryStatus: string
{
    case NEW = 'new';
    case IN_PROGRESS = 'in_progress';
    case RESOLVED = 'resolved';
    case CLOSED = 'closed';
    case SPAM = 'spam';
}

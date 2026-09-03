<?php

namespace App\Enums;

enum RequestStatus: string
{
    case NEW = 'new';
    case ASSIGNED = 'assigned';
    case IN_PROGRESS = 'in_progress';
    case WAITING_CLIENT = 'waiting_client';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
}

<?php

namespace App\Enums;

enum ServiceInterest: string
{
    case HOTELS_ACCOMMODATION = 'hotels_accommodation';
    case FLIGHT_ARRANGEMENTS = 'flight_arrangements';
    case TRANSFERS = 'transfers';
    case CAR_RENTAL = 'car_rental';
    case TOURS_EXPERIENCES = 'tours_experiences';
    case GROUPS_SPECIAL_REQUESTS = 'groups_special_requests';
    case CORPORATE_TRAVEL = 'corporate_travel';
    case HOSPITALITY_SOLUTIONS = 'hospitality_solutions';
    case TAXIDIA_B2B_PLATFORM = 'taxidia_b2b_platform';
    case PARTNERSHIP = 'partnership';
    case GENERAL_BUSINESS = 'general_business';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum OpportunityStage: string
{
    case QUALIFICATION = 'qualification';
    case DISCOVERY = 'discovery';
    case PROPOSAL = 'proposal';
    case NEGOTIATION = 'negotiation';
    case WON = 'won';
    case LOST = 'lost';
}

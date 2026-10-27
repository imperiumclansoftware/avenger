<?php

namespace App\Enum;

/**
 * The ticket queues of a product: each product gets one queue per type when it is created.
 */
enum TicketType: string
{
    case Bug = 'bug';
    case Feedback = 'feedback';
    case Feature = 'feature';

    public function label(): string
    {
        return match ($this) {
            self::Bug => 'Bugs',
            self::Feedback => 'Retours utilisateurs',
            self::Feature => 'Demandes de fonctionnalités',
        };
    }
}

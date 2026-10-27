<?php

namespace App\Dto;

use App\Enum\TicketStatus;
use App\Enum\TicketType;

final readonly class TicketFilter
{
    public function __construct(
        public ?TicketType $type = null,
        public ?TicketStatus $status = null,
    ) {
    }
}

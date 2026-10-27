<?php

namespace App\Dto;

use App\Enum\TicketStatus;
use App\Enum\TicketType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class TicketUpdateRequest
{
    public function __construct(
        #[Assert\NotNull]
        public ?TicketStatus $status = null,
        /** Queue to move the ticket to */
        #[Assert\NotNull]
        public ?TicketType $type = null,
    ) {
    }
}

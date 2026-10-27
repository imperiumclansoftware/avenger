<?php

namespace App\Dto;

final readonly class NotificationsRequest
{
    public function __construct(
        public bool $notifyNewTickets = true,
    ) {
    }
}

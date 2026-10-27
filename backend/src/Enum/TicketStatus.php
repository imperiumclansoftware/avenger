<?php

namespace App\Enum;

enum TicketStatus: string
{
    case New = 'new';
    case Accepted = 'accepted';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Rejected = 'rejected';
    case Closed = 'closed';
}

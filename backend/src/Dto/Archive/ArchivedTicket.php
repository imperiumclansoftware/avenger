<?php

namespace App\Dto\Archive;

use App\Enum\TicketStatus;
use App\Enum\TicketType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class ArchivedTicket
{
    public function __construct(
        #[Assert\Positive]
        public int $number = 0,
        #[Assert\NotNull]
        public ?TicketType $type = null,
        #[Assert\NotNull]
        public ?TicketStatus $status = null,
        #[Assert\NotBlank]
        #[Assert\Length(max: 200)]
        public string $title = '',
        #[Assert\Length(max: 1000000)]
        public string $description = '',
        #[Assert\NotBlank]
        #[Assert\Length(max: 100)]
        public string $authorName = '',
        #[Assert\NotBlank]
        #[Assert\Email]
        #[Assert\Length(max: 180)]
        public string $authorEmail = '',
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
    ) {
    }
}

<?php

namespace App\Dto;

use App\Enum\TicketType;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * A ticket opened from the public area, without an account.
 */
final readonly class TicketRequest
{
    public function __construct(
        #[Assert\NotNull(message: 'Choisissez le type de ticket.')]
        public ?TicketType $type = null,
        #[Assert\NotBlank(message: 'Le titre est obligatoire.')]
        #[Assert\Length(max: 200)]
        public string $title = '',
        #[Assert\NotBlank(message: 'La description est obligatoire.')]
        #[Assert\Length(max: 20000)]
        public string $description = '',
        #[Assert\NotBlank(message: 'Votre nom est obligatoire.')]
        #[Assert\Length(max: 100)]
        public string $authorName = '',
        #[Assert\NotBlank(message: 'Votre e-mail est obligatoire.')]
        #[Assert\Email(message: 'L\'e-mail n\'est pas valide.')]
        #[Assert\Length(max: 180)]
        public string $authorEmail = '',
    ) {
    }
}

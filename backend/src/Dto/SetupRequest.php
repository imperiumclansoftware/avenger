<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Installation wizard: the first administrator of the private area.
 */
final readonly class SetupRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Saisissez le code d\'installation.')]
        #[Assert\Length(max: 32)]
        public string $code = '',
        #[Assert\NotBlank(message: 'L\'e-mail est obligatoire.')]
        #[Assert\Email(message: 'L\'e-mail n\'est pas valide.')]
        #[Assert\Length(max: 180)]
        public string $email = '',
        #[Assert\NotBlank(message: 'Le mot de passe est obligatoire.')]
        #[Assert\Length(min: 12, max: 4096, minMessage: 'Le mot de passe doit faire au moins 12 caractères.')]
        public string $password = '',
    ) {
    }
}

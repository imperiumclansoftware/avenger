<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class PasswordChangeRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Saisissez votre mot de passe actuel.')]
        public string $currentPassword = '',
        #[Assert\NotBlank(message: 'Choisissez un nouveau mot de passe.')]
        #[Assert\Length(min: 12, max: 4096, minMessage: 'Le mot de passe doit faire au moins 12 caractères.')]
        public string $newPassword = '',
    ) {
    }
}

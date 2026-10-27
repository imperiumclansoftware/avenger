<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ProductRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le nom est obligatoire.')]
        #[Assert\Length(max: 120)]
        public string $name = '',
        /** Generated from the name when empty */
        #[Assert\Length(max: 120)]
        #[Assert\Regex(pattern: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/', message: 'L\'adresse ne peut contenir que des minuscules, des chiffres et des tirets.')]
        public ?string $slug = null,
        #[Assert\Length(max: 255)]
        public string $tagline = '',
        public string $homepage = '',
        #[Assert\Url(message: 'L\'adresse du dépôt n\'est pas valide.', requireTld: true)]
        #[Assert\Length(max: 255)]
        public ?string $repositoryUrl = null,
        public bool $published = false,
    ) {
    }
}

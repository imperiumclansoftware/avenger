<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class WikiPageRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le titre est obligatoire.')]
        #[Assert\Length(max: 160)]
        public string $title = '',
        /** Generated from the title when empty */
        #[Assert\Length(max: 160)]
        #[Assert\Regex(pattern: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/', message: 'L\'adresse ne peut contenir que des minuscules, des chiffres et des tirets.')]
        public ?string $slug = null,
        public string $content = '',
    ) {
    }
}

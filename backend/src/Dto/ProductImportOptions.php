<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Query string of an import: the address to give the product, when its own is taken here */
final readonly class ProductImportOptions
{
    public function __construct(
        #[Assert\Length(max: 120)]
        #[Assert\Regex(pattern: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/', message: 'L\'adresse ne peut contenir que des minuscules sans accents, des chiffres et des tirets (ex. : mon-projet).')]
        public ?string $slug = null,
    ) {
    }
}

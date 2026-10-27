<?php

namespace App\Dto\Archive;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ArchivedProduct
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 120)]
        public string $name = '',
        #[Assert\NotBlank]
        #[Assert\Length(max: 120)]
        #[Assert\Regex(pattern: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/')]
        public string $slug = '',
        #[Assert\Length(max: 255)]
        public string $tagline = '',
        #[Assert\Length(max: 1000000)]
        public string $homepage = '',
        #[Assert\Url(requireTld: true)]
        #[Assert\Length(max: 255)]
        public ?string $repositoryUrl = null,
        public bool $published = false,
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
        #[Assert\Valid]
        public ?ArchivedIcon $icon = null,
    ) {
    }
}

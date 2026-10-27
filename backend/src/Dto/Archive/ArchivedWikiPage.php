<?php

namespace App\Dto\Archive;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ArchivedWikiPage
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 160)]
        public string $title = '',
        #[Assert\NotBlank]
        #[Assert\Length(max: 160)]
        #[Assert\Regex(pattern: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/')]
        public string $slug = '',
        #[Assert\Length(max: 1000000)]
        public string $content = '',
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
    ) {
    }
}

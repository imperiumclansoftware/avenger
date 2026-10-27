<?php

namespace App\Dto\Archive;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ArchivedIcon
{
    public function __construct(
        /** The image, base64 */
        #[Assert\NotBlank]
        #[Assert\Length(max: 1500000)]
        public string $data = '',
    ) {
    }
}

<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class GeneralSettingsRequest
{
    public function __construct(
        /** Public address of Avenger, for the links of the e-mails (empty: no link) */
        #[Assert\Url(message: 'L\'adresse n\'est pas valide (ex. : https://avenger.example.org).', requireTld: false)]
        #[Assert\Length(max: 255)]
        public ?string $appUrl = null,
    ) {
    }
}

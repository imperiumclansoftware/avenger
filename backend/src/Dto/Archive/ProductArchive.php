<?php

namespace App\Dto\Archive;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * A product exported by an Avenger (ProductArchiver::export), to import into another one.
 */
final readonly class ProductArchive
{
    public const FORMAT = 'avenger-product';
    public const VERSION = 1;

    /**
     * @param list<ArchivedWikiPage> $wiki
     * @param list<ArchivedTicket>   $tickets
     */
    public function __construct(
        #[Assert\EqualTo(value: self::FORMAT, message: 'Ce fichier n\'est pas un export de produit Avenger.')]
        public string $format = '',
        #[Assert\EqualTo(value: self::VERSION, message: 'Version d\'export non prise en charge : mettez à jour cet Avenger.')]
        public int $version = 0,
        #[Assert\NotNull(message: 'Le produit manque dans le fichier.')]
        #[Assert\Valid]
        public ?ArchivedProduct $product = null,
        #[Assert\Count(max: 1000)]
        #[Assert\Valid]
        public array $wiki = [],
        #[Assert\Count(max: 50000)]
        #[Assert\Valid]
        public array $tickets = [],
        #[Assert\PositiveOrZero]
        public int $ticketCounter = 0,
    ) {
    }
}

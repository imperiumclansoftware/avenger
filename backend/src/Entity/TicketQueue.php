<?php

namespace App\Entity;

use App\Enum\TicketType;
use Doctrine\ORM\Mapping as ORM;

/**
 * A ticket queue of a product: bugs, user feedback or feature requests.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(columns: ['product_id', 'type'])]
class TicketQueue
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'queues')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\Column(length: 20, enumType: TicketType::class)]
    private TicketType $type;

    #[ORM\Column(length: 120)]
    private string $name;

    public function __construct(Product $product, TicketType $type)
    {
        $this->product = $product;
        $this->type = $type;
        $this->name = $type->label();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProduct(): Product
    {
        return $this->product;
    }

    public function getType(): TicketType
    {
        return $this->type;
    }

    public function getName(): string
    {
        return $this->name;
    }
}

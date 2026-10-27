<?php

namespace App\Entity;

use App\Enum\TicketStatus;
use App\Repository\TicketRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TicketRepository::class)]
#[ORM\UniqueConstraint(columns: ['product_id', 'number'])]
#[ORM\Index(columns: ['queue_id', 'status'])]
class Ticket
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** Denormalized from the queue, for the numbering per product */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private TicketQueue $queue;

    /** Number shown to users, per product (#1, #2…) */
    #[ORM\Column]
    private int $number;

    #[ORM\Column(length: 200)]
    private string $title;

    /** Markdown */
    #[ORM\Column(type: 'text')]
    private string $description;

    #[ORM\Column(length: 20, enumType: TicketStatus::class)]
    private TicketStatus $status = TicketStatus::New;

    #[ORM\Column(length: 100)]
    private string $authorName;

    /** Only shown in the private area, to answer the author */
    #[ORM\Column(length: 180)]
    private string $authorEmail;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(TicketQueue $queue, int $number, string $title, string $description, string $authorName, string $authorEmail)
    {
        $this->product = $queue->getProduct();
        $this->queue = $queue;
        $this->number = $number;
        $this->title = $title;
        $this->description = $description;
        $this->authorName = $authorName;
        $this->authorEmail = $authorEmail;
        $this->createdAt = $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProduct(): Product
    {
        return $this->product;
    }

    public function getQueue(): TicketQueue
    {
        return $this->queue;
    }

    /** Moves the ticket to another queue of its product (a "bug" that is a feature request…) */
    public function moveTo(TicketQueue $queue): void
    {
        if ($queue->getProduct() !== $this->product) {
            throw new \InvalidArgumentException('A ticket can only move to a queue of its product.');
        }
        if ($queue !== $this->queue) {
            $this->queue = $queue;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getNumber(): int
    {
        return $this->number;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getStatus(): TicketStatus
    {
        return $this->status;
    }

    public function setStatus(TicketStatus $status): void
    {
        if ($status !== $this->status) {
            $this->status = $status;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function getAuthorName(): string
    {
        return $this->authorName;
    }

    public function getAuthorEmail(): string
    {
        return $this->authorEmail;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}

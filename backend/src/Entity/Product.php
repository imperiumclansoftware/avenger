<?php

namespace App\Entity;

use App\Enum\TicketType;
use App\Repository\ProductRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * An open source project presented on the site. Created with its wiki and its ticket queues.
 */
#[ORM\Entity(repositoryClass: ProductRepository::class)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 120, unique: true)]
    private string $slug;

    #[ORM\Column(length: 255)]
    private string $tagline = '';

    /** Markdown content of the product's home page */
    #[ORM\Column(type: 'text')]
    private string $homepage = '';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $repositoryUrl = null;

    /** Name of the icon file (see ProductIcons), random */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $iconFile = null;

    /** Unpublished products are only visible in the private area */
    #[ORM\Column]
    private bool $published = false;

    /** Last ticket number given, tickets are numbered per product */
    #[ORM\Column]
    private int $ticketCounter = 0;

    #[ORM\OneToOne(mappedBy: 'product', cascade: ['persist', 'remove'])]
    private Wiki $wiki;

    /** @var Collection<int, TicketQueue> */
    #[ORM\OneToMany(targetEntity: TicketQueue::class, mappedBy: 'product', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $queues;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $name, string $slug)
    {
        $this->name = $name;
        $this->slug = $slug;
        $this->createdAt = $this->updatedAt = new \DateTimeImmutable();
        $this->wiki = new Wiki($this);
        $this->queues = new ArrayCollection();
        foreach (TicketType::cases() as $type) {
            $this->queues->add(new TicketQueue($this, $type));
        }
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getTagline(): string
    {
        return $this->tagline;
    }

    public function getHomepage(): string
    {
        return $this->homepage;
    }

    public function getRepositoryUrl(): ?string
    {
        return $this->repositoryUrl;
    }

    public function getIconFile(): ?string
    {
        return $this->iconFile;
    }

    public function setIconFile(?string $iconFile): void
    {
        $this->iconFile = $iconFile;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function update(string $name, string $slug, string $tagline, string $homepage, ?string $repositoryUrl, bool $published): void
    {
        $this->name = $name;
        $this->slug = $slug;
        $this->tagline = $tagline;
        $this->homepage = $homepage;
        $this->repositoryUrl = $repositoryUrl;
        $this->published = $published;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getWiki(): Wiki
    {
        return $this->wiki;
    }

    /** @return Collection<int, TicketQueue> */
    public function getQueues(): Collection
    {
        return $this->queues;
    }

    public function getQueue(TicketType $type): TicketQueue
    {
        foreach ($this->queues as $queue) {
            if ($queue->getType() === $type) {
                return $queue;
            }
        }

        throw new \LogicException(\sprintf('Product "%s" has no "%s" queue.', $this->slug, $type->value));
    }

    /** Import (ProductArchiver): numbering goes on after the imported tickets. */
    public function continueNumberingAfter(int $number): void
    {
        $this->ticketCounter = max($this->ticketCounter, $number);
    }

    public function getTicketCounter(): int
    {
        return $this->ticketCounter;
    }

    /** Import (ProductArchiver): the dates of the original site. */
    public function restoreDates(?\DateTimeImmutable $createdAt, ?\DateTimeImmutable $updatedAt): void
    {
        $this->createdAt = $createdAt ?? $this->createdAt;
        $this->updatedAt = $updatedAt ?? $this->updatedAt;
    }

    /** To be called with the product locked, see TicketManager. */
    public function nextTicketNumber(): int
    {
        return ++$this->ticketCounter;
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

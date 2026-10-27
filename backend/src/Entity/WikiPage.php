<?php

namespace App\Entity;

use App\Repository\WikiPageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: WikiPageRepository::class)]
#[ORM\UniqueConstraint(columns: ['wiki_id', 'slug'])]
class WikiPage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'pages')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Wiki $wiki;

    #[ORM\Column(length: 160)]
    private string $title;

    #[ORM\Column(length: 160)]
    private string $slug;

    /** Markdown */
    #[ORM\Column(type: 'text')]
    private string $content;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(Wiki $wiki, string $title, string $slug, string $content)
    {
        $this->wiki = $wiki;
        $this->title = $title;
        $this->slug = $slug;
        $this->content = $content;
        $this->createdAt = $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getWiki(): Wiki
    {
        return $this->wiki;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function isHome(): bool
    {
        return Wiki::HOME_SLUG === $this->slug;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function update(string $title, string $slug, string $content): void
    {
        $this->title = $title;
        $this->slug = $slug;
        $this->content = $content;
        $this->updatedAt = new \DateTimeImmutable();
    }

    /** Import (ProductArchiver): the dates of the original site. */
    public function restoreDates(?\DateTimeImmutable $createdAt, ?\DateTimeImmutable $updatedAt): void
    {
        $this->createdAt = $createdAt ?? $this->createdAt;
        $this->updatedAt = $updatedAt ?? $this->updatedAt;
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

<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * The wiki of a product, created with it along with its home page.
 */
#[ORM\Entity]
class Wiki
{
    public const HOME_SLUG = 'accueil';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'wiki')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    /** @var Collection<int, WikiPage> */
    #[ORM\OneToMany(targetEntity: WikiPage::class, mappedBy: 'wiki', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['title' => 'ASC'])]
    private Collection $pages;

    public function __construct(Product $product)
    {
        $this->product = $product;
        $this->pages = new ArrayCollection([
            new WikiPage($this, 'Accueil', self::HOME_SLUG, \sprintf("# %s\n\nBienvenue sur le wiki de %s.", $product->getName(), $product->getName())),
        ]);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProduct(): Product
    {
        return $this->product;
    }

    /** @return Collection<int, WikiPage> */
    public function getPages(): Collection
    {
        return $this->pages;
    }

    public function addPage(WikiPage $page): void
    {
        $this->pages->add($page);
    }

    public function removePage(WikiPage $page): void
    {
        $this->pages->removeElement($page);
    }
}

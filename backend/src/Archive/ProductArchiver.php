<?php

namespace App\Archive;

use App\Dto\Archive\ArchivedTicket;
use App\Dto\Archive\ArchivedWikiPage;
use App\Dto\Archive\ProductArchive;
use App\Entity\Product;
use App\Entity\Ticket;
use App\Entity\Wiki;
use App\Entity\WikiPage;
use App\Product\InvalidIconException;
use App\Product\ProductIcons;
use App\Product\SlugTakenException;
use App\Repository\ProductRepository;
use App\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Moves a product from an Avenger to another: one JSON file with its page, icon, wiki and,
 * if asked, its tickets (with the authors' e-mails, hence the choice).
 */
final class ProductArchiver
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ProductRepository $products,
        private readonly TicketRepository $tickets,
        private readonly ProductIcons $icons,
    ) {
    }

    /** @return array<string, mixed> */
    public function export(Product $product, bool $withTickets): array
    {
        $icon = $this->icons->read($product);

        return [
            'format' => ProductArchive::FORMAT,
            'version' => ProductArchive::VERSION,
            'exportedAt' => (new \DateTimeImmutable())->format(\DATE_ATOM),
            'product' => [
                'name' => $product->getName(),
                'slug' => $product->getSlug(),
                'tagline' => $product->getTagline(),
                'homepage' => $product->getHomepage(),
                'repositoryUrl' => $product->getRepositoryUrl(),
                'published' => $product->isPublished(),
                'createdAt' => $product->getCreatedAt()->format(\DATE_ATOM),
                'updatedAt' => $product->getUpdatedAt()->format(\DATE_ATOM),
                'icon' => null === $icon ? null : ['data' => base64_encode($icon)],
            ],
            'wiki' => array_map(static fn (WikiPage $page) => [
                'title' => $page->getTitle(),
                'slug' => $page->getSlug(),
                'content' => $page->getContent(),
                'createdAt' => $page->getCreatedAt()->format(\DATE_ATOM),
                'updatedAt' => $page->getUpdatedAt()->format(\DATE_ATOM),
            ], $product->getWiki()->getPages()->getValues()),
            'tickets' => $withTickets ? array_map(static fn (Ticket $ticket) => [
                'number' => $ticket->getNumber(),
                'type' => $ticket->getQueue()->getType()->value,
                'status' => $ticket->getStatus()->value,
                'title' => $ticket->getTitle(),
                'description' => $ticket->getDescription(),
                'authorName' => $ticket->getAuthorName(),
                'authorEmail' => $ticket->getAuthorEmail(),
                'createdAt' => $ticket->getCreatedAt()->format(\DATE_ATOM),
                'updatedAt' => $ticket->getUpdatedAt()->format(\DATE_ATOM),
            ], array_reverse($this->tickets->search($product))) : [],
            // Numbers already given, even to deleted tickets: never given twice
            'ticketCounter' => $product->getTicketCounter(),
        ];
    }

    /**
     * Creates the product of the archive, as a draft: an administrator checks it before publishing.
     *
     * @throws SlugTakenException
     * @throws InvalidIconException
     * @throws InvalidArchiveException
     */
    public function import(ProductArchive $archive, ?string $slug = null): Product
    {
        $source = $archive->product ?? throw new InvalidArchiveException('product', 'Le produit manque dans le fichier.');
        $slug = $slug ?: $source->slug;
        if ($this->products->slugExists($slug)) {
            throw new SlugTakenException($slug);
        }
        $this->assertUnique(array_map(static fn (ArchivedWikiPage $p) => $p->slug, $archive->wiki), 'wiki', 'Deux pages du wiki ont la même adresse : %s.');
        $this->assertUnique(array_map(static fn (ArchivedTicket $t) => (string) $t->number, $archive->tickets), 'tickets', 'Deux tickets ont le même numéro : %s.');
        // Checked before anything is written
        $icon = null;
        if (null !== $source->icon) {
            $icon = base64_decode($source->icon->data, true);
            if (false === $icon) {
                throw new InvalidArchiveException('product.icon', 'L\'icône du fichier est illisible.');
            }
            $this->icons->extensionOf($icon);
        }

        $product = $this->em->wrapInTransaction(function () use ($archive, $source, $slug): Product {
            $product = new Product(trim($source->name), $slug);
            $product->update(trim($source->name), $slug, trim($source->tagline), $source->homepage, $source->repositoryUrl ?: null, false);
            $this->importWiki($product->getWiki(), $archive->wiki);

            $last = 0;
            foreach ($archive->tickets as $archived) {
                $ticket = new Ticket(
                    $product->getQueue($archived->type),
                    $archived->number,
                    trim($archived->title),
                    $archived->description,
                    trim($archived->authorName),
                    mb_strtolower(trim($archived->authorEmail)),
                );
                $ticket->setStatus($archived->status);
                $ticket->restoreDates($archived->createdAt, $archived->updatedAt);
                $this->em->persist($ticket);
                $last = max($last, $archived->number);
            }
            $product->continueNumberingAfter(max($last, $archive->ticketCounter));
            $product->restoreDates($source->createdAt, $source->updatedAt);
            $this->em->persist($product);

            return $product;
        });

        if (null !== $icon) {
            $this->icons->replaceWithContent($product, $icon);
            // Setting the icon is not an edit of the product
            $product->restoreDates($source->createdAt, $source->updatedAt);
            $this->em->flush();
        }

        return $product;
    }

    /** @param list<ArchivedWikiPage> $pages */
    private function importWiki(Wiki $wiki, array $pages): void
    {
        foreach ($pages as $archived) {
            // The home page exists with every product: it gets the archived content
            if (Wiki::HOME_SLUG === $archived->slug) {
                $page = $wiki->getHome();
                $page->update(trim($archived->title), Wiki::HOME_SLUG, $archived->content);
            } else {
                $page = new WikiPage($wiki, trim($archived->title), $archived->slug, $archived->content);
                $wiki->addPage($page);
            }
            $page->restoreDates($archived->createdAt, $archived->updatedAt);
        }
    }

    /** @param list<string> $values */
    private function assertUnique(array $values, string $path, string $message): void
    {
        $duplicates = array_keys(array_filter(array_count_values($values), static fn (int $count) => $count > 1));
        if ([] !== $duplicates) {
            throw new InvalidArchiveException($path, \sprintf($message, implode(', ', $duplicates)));
        }
    }
}

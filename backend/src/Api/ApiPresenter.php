<?php

namespace App\Api;

use App\Entity\Product;
use App\Entity\Ticket;
use App\Entity\TicketQueue;
use App\Entity\User;
use App\Entity\WikiPage;
use App\Repository\TicketRepository;

use function Symfony\Component\String\u;

/**
 * Turns entities into the JSON structures exposed by the API.
 */
final class ApiPresenter
{
    public function __construct(private readonly TicketRepository $tickets)
    {
    }

    public function user(User $user): array
    {
        return [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'admin' => $user->isAdmin(),
        ];
    }

    public function productSummary(Product $product): array
    {
        return [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'slug' => $product->getSlug(),
            'tagline' => $product->getTagline(),
            'repositoryUrl' => $product->getRepositoryUrl(),
            // Relative to the app's base URL, like the API calls
            'iconUrl' => null === $product->getIconFile() ? null : 'api/icons/'.$product->getIconFile(),
            'published' => $product->isPublished(),
            'updatedAt' => $product->getUpdatedAt()->format(\DATE_ATOM),
        ];
    }

    /** A product of the public list, with the counts shown on its card. */
    public function productCard(Product $product): array
    {
        return $this->productSummary($product) + [
            'wikiPageCount' => $product->getWiki()->getPages()->count(),
            'openTicketCount' => array_sum($this->tickets->countOpenByType($product)),
        ];
    }

    /** A product with its home page, wiki pages and ticket queues. */
    public function product(Product $product): array
    {
        $openCounts = $this->tickets->countOpenByType($product);

        return $this->productSummary($product) + [
            'homepage' => $product->getHomepage(),
            'createdAt' => $product->getCreatedAt()->format(\DATE_ATOM),
            'wikiPages' => array_map($this->wikiPageSummary(...), $this->sortedPages($product)),
            'queues' => array_map(
                fn (TicketQueue $queue) => $this->queue($queue, $openCounts[$queue->getType()->value] ?? 0),
                $product->getQueues()->getValues(),
            ),
        ];
    }

    /**
     * The home page first, then alphabetical order ignoring case and accents ("Événements" next to "Équipe", not after "Z").
     *
     * @return list<WikiPage>
     */
    private function sortedPages(Product $product): array
    {
        $pages = $product->getWiki()->getPages()->getValues();
        $key = static fn (WikiPage $page): string => u($page->getTitle())->ascii()->lower()->toString();
        usort($pages, static fn (WikiPage $a, WikiPage $b): int => [$b->isHome(), $key($a)] <=> [$a->isHome(), $key($b)]);

        return $pages;
    }

    public function queue(TicketQueue $queue, int $openCount): array
    {
        return [
            'type' => $queue->getType()->value,
            'name' => $queue->getName(),
            'openCount' => $openCount,
        ];
    }

    public function wikiPageSummary(WikiPage $page): array
    {
        return [
            'id' => $page->getId(),
            'slug' => $page->getSlug(),
            'title' => $page->getTitle(),
            'home' => $page->isHome(),
        ];
    }

    public function wikiPage(WikiPage $page): array
    {
        return $this->wikiPageSummary($page) + [
            'content' => $page->getContent(),
            'updatedAt' => $page->getUpdatedAt()->format(\DATE_ATOM),
        ];
    }

    /** What anyone can see of a ticket: not the author's e-mail. */
    public function ticket(Ticket $ticket): array
    {
        return [
            'number' => $ticket->getNumber(),
            'type' => $ticket->getQueue()->getType()->value,
            'queueName' => $ticket->getQueue()->getName(),
            'title' => $ticket->getTitle(),
            'description' => $ticket->getDescription(),
            'status' => $ticket->getStatus()->value,
            'authorName' => $ticket->getAuthorName(),
            'createdAt' => $ticket->getCreatedAt()->format(\DATE_ATOM),
            'updatedAt' => $ticket->getUpdatedAt()->format(\DATE_ATOM),
        ];
    }

    public function adminTicket(Ticket $ticket): array
    {
        return ['id' => $ticket->getId()] + $this->ticket($ticket) + [
            'authorEmail' => $ticket->getAuthorEmail(),
        ];
    }
}

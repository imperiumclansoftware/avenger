<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\TicketFilter;
use App\Dto\TicketRequest;
use App\Repository\ProductRepository;
use App\Repository\TicketRepository;
use App\Ticket\TicketManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public area: the tickets of a published product. Anyone can open one, without an account.
 */
#[Route('/api/products/{slug}/tickets', format: 'json')]
final class TicketController extends AbstractController
{
    public function __construct(
        private readonly ProductRepository $products,
        private readonly TicketRepository $tickets,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('', name: 'api_tickets', methods: ['GET'])]
    public function list(string $slug, #[MapQueryString] TicketFilter $filter = new TicketFilter()): JsonResponse
    {
        $product = $this->products->findPublishedBySlug($slug);
        if (null === $product) {
            return Problem::notFound('Produit introuvable.');
        }

        return $this->json(array_map(
            $this->presenter->ticket(...),
            $this->tickets->search($product, $filter->type, $filter->status),
        ));
    }

    #[Route('/{number<\d+>}', name: 'api_ticket', methods: ['GET'])]
    public function show(string $slug, int $number): JsonResponse
    {
        $product = $this->products->findPublishedBySlug($slug);
        $ticket = $product ? $this->tickets->findOneByNumber($product, $number) : null;

        return $ticket ? $this->json($this->presenter->ticket($ticket)) : Problem::notFound('Ticket introuvable.');
    }

    #[Route('', name: 'api_ticket_create', methods: ['POST'])]
    public function create(
        string $slug,
        #[MapRequestPayload] TicketRequest $payload,
        Request $request,
        TicketManager $manager,
        #[Autowire(service: 'limiter.ticket_submission')] RateLimiterFactoryInterface $limiter,
    ): JsonResponse {
        $product = $this->products->findPublishedBySlug($slug);
        if (null === $product) {
            return Problem::notFound('Produit introuvable.');
        }
        if (!$limiter->create($request->getClientIp())->consume()->isAccepted()) {
            return $this->json(['title' => 'Too Many Requests', 'detail' => 'Trop de tickets envoyés, réessayez dans quelques minutes.'], 429);
        }

        return $this->json($this->presenter->ticket($manager->open($product, $payload)), 201);
    }
}

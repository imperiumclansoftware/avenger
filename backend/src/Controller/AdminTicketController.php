<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Dto\TicketFilter;
use App\Dto\TicketUpdateRequest;
use App\Entity\Product;
use App\Entity\Ticket;
use App\Repository\TicketRepository;
use App\Ticket\TicketManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Private area: handling the tickets of a product (status, queue), with the authors' e-mails.
 */
#[Route('/api/admin/products/{id<\d+>}/tickets', format: 'json')]
#[IsGranted('ROLE_ADMIN')]
final class AdminTicketController extends AbstractController
{
    public function __construct(
        private readonly TicketManager $manager,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('', name: 'api_admin_tickets', methods: ['GET'])]
    public function list(Product $product, TicketRepository $tickets, #[MapQueryString] TicketFilter $filter = new TicketFilter()): JsonResponse
    {
        return $this->json(array_map(
            $this->presenter->adminTicket(...),
            $tickets->search($product, $filter->type, $filter->status),
        ));
    }

    #[Route('/{number<\d+>}', name: 'api_admin_ticket_update', methods: ['PUT'])]
    public function update(
        #[MapEntity(mapping: ['id' => 'product', 'number' => 'number'])] Ticket $ticket,
        #[MapRequestPayload] TicketUpdateRequest $request,
    ): JsonResponse {
        $this->manager->update($ticket, $request);

        return $this->json($this->presenter->adminTicket($ticket));
    }

    #[Route('/{number<\d+>}', name: 'api_admin_ticket_delete', methods: ['DELETE'])]
    public function delete(#[MapEntity(mapping: ['id' => 'product', 'number' => 'number'])] Ticket $ticket): Response
    {
        $this->manager->delete($ticket);

        return new Response(status: 204);
    }
}

<?php

namespace App\Ticket;

use App\Dto\TicketRequest;
use App\Dto\TicketUpdateRequest;
use App\Entity\Product;
use App\Entity\Ticket;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

final class TicketManager
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function open(Product $product, TicketRequest $request): Ticket
    {
        return $this->em->wrapInTransaction(function () use ($product, $request): Ticket {
            // Tickets are numbered per product: lock the product so that two tickets don't get the same number,
            // then read its counter again. Not refresh($product, PESSIMISTIC_WRITE): it joins the wiki, and
            // PostgreSQL refuses FOR UPDATE on the nullable side of an outer join.
            $this->em->lock($product, LockMode::PESSIMISTIC_WRITE);
            $this->em->refresh($product);

            $ticket = new Ticket(
                $product->getQueue($request->type),
                $product->nextTicketNumber(),
                trim($request->title),
                $request->description,
                trim($request->authorName),
                mb_strtolower(trim($request->authorEmail)),
            );
            $this->em->persist($ticket);

            return $ticket;
        });
    }

    public function update(Ticket $ticket, TicketUpdateRequest $request): void
    {
        $ticket->setStatus($request->status);
        $ticket->moveTo($ticket->getProduct()->getQueue($request->type));
        $this->em->flush();
    }

    public function delete(Ticket $ticket): void
    {
        $this->em->remove($ticket);
        $this->em->flush();
    }
}

<?php

namespace App\Repository;

use App\Entity\Product;
use App\Entity\Ticket;
use App\Enum\TicketStatus;
use App\Enum\TicketType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Ticket>
 */
class TicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Ticket::class);
    }

    /** @return list<Ticket> Most recent first */
    public function search(Product $product, ?TicketType $type = null, ?TicketStatus $status = null): array
    {
        $qb = $this->createQueryBuilder('t')
            ->join('t.queue', 'q')
            ->addSelect('q')
            ->where('t.product = :product')
            ->setParameter('product', $product)
            ->orderBy('t.number', 'DESC');

        if (null !== $type) {
            $qb->andWhere('q.type = :type')->setParameter('type', $type);
        }
        if (null !== $status) {
            $qb->andWhere('t.status = :status')->setParameter('status', $status);
        }

        return $qb->getQuery()->getResult();
    }

    public function findOneByNumber(Product $product, int $number): ?Ticket
    {
        return $this->findOneBy(['product' => $product, 'number' => $number]);
    }

    /**
     * Open tickets (not resolved, rejected or closed) per queue type.
     *
     * @return array<string, int> Indexed by TicketType value
     */
    public function countOpenByType(Product $product): array
    {
        $rows = $this->createQueryBuilder('t')
            ->select('q.type AS type, COUNT(t.id) AS total')
            ->join('t.queue', 'q')
            ->where('t.product = :product')
            ->andWhere('t.status IN (:open)')
            ->groupBy('q.type')
            ->setParameter('product', $product)
            ->setParameter('open', [TicketStatus::New, TicketStatus::Accepted, TicketStatus::InProgress])
            ->getQuery()
            ->getArrayResult();

        $counts = array_fill_keys(array_map(static fn (TicketType $t) => $t->value, TicketType::cases()), 0);
        foreach ($rows as $row) {
            $type = $row['type'] instanceof TicketType ? $row['type']->value : $row['type'];
            $counts[$type] = (int) $row['total'];
        }

        return $counts;
    }
}

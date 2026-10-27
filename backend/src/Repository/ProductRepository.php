<?php

namespace App\Repository;

use App\Entity\Product;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Product>
 */
class ProductRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Product::class);
    }

    /** @return list<Product> */
    public function findPublished(): array
    {
        return $this->findBy(['published' => true], ['name' => 'ASC']);
    }

    public function findPublishedBySlug(string $slug): ?Product
    {
        return $this->findOneBy(['slug' => $slug, 'published' => true]);
    }

    public function slugExists(string $slug, ?Product $except = null): bool
    {
        $product = $this->findOneBy(['slug' => $slug]);

        return null !== $product && $product !== $except;
    }
}

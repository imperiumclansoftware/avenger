<?php

namespace App\Repository;

use App\Entity\Wiki;
use App\Entity\WikiPage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<WikiPage>
 */
class WikiPageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WikiPage::class);
    }

    public function findOneBySlug(Wiki $wiki, string $slug): ?WikiPage
    {
        return $this->findOneBy(['wiki' => $wiki, 'slug' => $slug]);
    }

    public function slugExists(Wiki $wiki, string $slug, ?WikiPage $except = null): bool
    {
        $page = $this->findOneBySlug($wiki, $slug);

        return null !== $page && $page !== $except;
    }
}

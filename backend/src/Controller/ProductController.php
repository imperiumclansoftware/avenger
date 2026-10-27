<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Entity\Product;
use App\Repository\ProductRepository;
use App\Repository\WikiPageRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public area: published products, their home page and their wiki.
 */
#[Route('/api/products', format: 'json')]
final class ProductController extends AbstractController
{
    public function __construct(
        private readonly ProductRepository $products,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('', name: 'api_products', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json(array_map($this->presenter->productCard(...), $this->products->findPublished()));
    }

    #[Route('/{slug}', name: 'api_product', methods: ['GET'])]
    public function show(string $slug): JsonResponse
    {
        $product = $this->products->findPublishedBySlug($slug);

        return $product ? $this->json($this->presenter->product($product)) : $this->productNotFound();
    }

    #[Route('/{slug}/wiki/{page}', name: 'api_product_wiki_page', methods: ['GET'])]
    public function wikiPage(string $slug, string $page, WikiPageRepository $pages): JsonResponse
    {
        $product = $this->products->findPublishedBySlug($slug);
        if (!$product instanceof Product) {
            return $this->productNotFound();
        }

        $wikiPage = $pages->findOneBySlug($product->getWiki(), $page);

        return $wikiPage ? $this->json($this->presenter->wikiPage($wikiPage)) : Problem::notFound('Page introuvable.');
    }

    private function productNotFound(): JsonResponse
    {
        return Problem::notFound('Produit introuvable.');
    }
}

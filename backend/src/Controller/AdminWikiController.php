<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\WikiPageRequest;
use App\Entity\Product;
use App\Entity\WikiPage;
use App\Product\SlugTakenException;
use App\Wiki\WikiManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Private area: the wiki pages of a product.
 */
#[Route('/api/admin/products/{id<\d+>}/wiki', format: 'json')]
#[IsGranted('ROLE_ADMIN')]
final class AdminWikiController extends AbstractController
{
    public function __construct(
        private readonly WikiManager $manager,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('/{pageId<\d+>}', name: 'api_admin_wiki_page', methods: ['GET'])]
    public function show(Product $product, #[MapEntity(id: 'pageId')] WikiPage $page): JsonResponse
    {
        return $this->notInWiki($product, $page) ?? $this->json($this->presenter->wikiPage($page));
    }

    #[Route('', name: 'api_admin_wiki_page_create', methods: ['POST'])]
    public function create(Product $product, #[MapRequestPayload] WikiPageRequest $request): JsonResponse
    {
        try {
            return $this->json($this->presenter->wikiPage($this->manager->create($product->getWiki(), $request)), 201);
        } catch (SlugTakenException $e) {
            return Problem::violation('slug', $e->getMessage());
        }
    }

    #[Route('/{pageId<\d+>}', name: 'api_admin_wiki_page_update', methods: ['PUT'])]
    public function update(Product $product, #[MapEntity(id: 'pageId')] WikiPage $page, #[MapRequestPayload] WikiPageRequest $request): JsonResponse
    {
        if (null !== $notFound = $this->notInWiki($product, $page)) {
            return $notFound;
        }
        try {
            $this->manager->update($page, $request);
        } catch (SlugTakenException $e) {
            return Problem::violation('slug', $e->getMessage());
        }

        return $this->json($this->presenter->wikiPage($page));
    }

    #[Route('/{pageId<\d+>}', name: 'api_admin_wiki_page_delete', methods: ['DELETE'])]
    public function delete(Product $product, #[MapEntity(id: 'pageId')] WikiPage $page): Response
    {
        if (null !== $notFound = $this->notInWiki($product, $page)) {
            return $notFound;
        }
        if ($page->isHome()) {
            return Problem::violation('page', 'La page d\'accueil du wiki ne peut pas être supprimée.');
        }
        $this->manager->delete($page);

        return new Response(status: 204);
    }

    /** A page of another product's wiki: as if it did not exist. */
    private function notInWiki(Product $product, WikiPage $page): ?JsonResponse
    {
        return $page->getWiki() !== $product->getWiki() ? Problem::notFound('Page introuvable.') : null;
    }
}

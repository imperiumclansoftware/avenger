<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\ProductRequest;
use App\Entity\Product;
use App\Product\InvalidIconException;
use App\Product\ProductIcons;
use App\Product\ProductManager;
use App\Product\SlugTakenException;
use App\Repository\ProductRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Attribute\MapUploadedFile;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Private area: products, published or not, and their home page.
 */
#[Route('/api/admin/products', format: 'json')]
#[IsGranted('ROLE_ADMIN')]
final class AdminProductController extends AbstractController
{
    public function __construct(
        private readonly ProductManager $manager,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('', name: 'api_admin_products', methods: ['GET'])]
    public function list(ProductRepository $products): JsonResponse
    {
        return $this->json(array_map($this->presenter->productSummary(...), $products->findBy([], ['name' => 'ASC'])));
    }

    #[Route('/{id<\d+>}', name: 'api_admin_product', methods: ['GET'])]
    public function show(Product $product): JsonResponse
    {
        return $this->json($this->presenter->product($product));
    }

    /** Creates the product along with its wiki and its ticket queues. */
    #[Route('', name: 'api_admin_product_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] ProductRequest $request): JsonResponse
    {
        try {
            return $this->json($this->presenter->product($this->manager->create($request)), 201);
        } catch (SlugTakenException $e) {
            return Problem::violation('slug', $e->getMessage());
        }
    }

    #[Route('/{id<\d+>}', name: 'api_admin_product_update', methods: ['PUT'])]
    public function update(Product $product, #[MapRequestPayload] ProductRequest $request): JsonResponse
    {
        try {
            $this->manager->update($product, $request);
        } catch (SlugTakenException $e) {
            return Problem::violation('slug', $e->getMessage());
        }

        return $this->json($this->presenter->product($product));
    }

    /** Replaces the icon (multipart, field "icon"). */
    #[Route('/{id<\d+>}/icon', name: 'api_admin_product_icon', methods: ['POST'])]
    public function uploadIcon(
        Product $product,
        ProductIcons $icons,
        #[MapUploadedFile([
            new Assert\NotNull(message: 'Choisissez une image.'),
            new Assert\File(
                maxSize: '1M',
                mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
                maxSizeMessage: 'L\'icône ne doit pas dépasser 1 Mo.',
                mimeTypesMessage: 'Formats acceptés : PNG, JPEG, WebP, GIF ou SVG.',
            ),
        ])]
        UploadedFile $icon,
    ): JsonResponse {
        try {
            $icons->replace($product, $icon);
        } catch (InvalidIconException $e) {
            return Problem::violation('icon', $e->getMessage());
        }

        return $this->json($this->presenter->product($product));
    }

    #[Route('/{id<\d+>}/icon', name: 'api_admin_product_icon_delete', methods: ['DELETE'])]
    public function removeIcon(Product $product, ProductIcons $icons): JsonResponse
    {
        $icons->remove($product);

        return $this->json($this->presenter->product($product));
    }

    /** Deletes the product with its wiki and its tickets. */
    #[Route('/{id<\d+>}', name: 'api_admin_product_delete', methods: ['DELETE'])]
    public function delete(Product $product): Response
    {
        $this->manager->delete($product);

        return new Response(status: 204);
    }
}

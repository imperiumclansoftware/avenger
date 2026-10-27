<?php

namespace App\Product;

use App\Dto\ProductRequest;
use App\Entity\Product;
use App\Repository\ProductRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\String\Slugger\SluggerInterface;

/**
 * Creates and edits products. A new product comes with its wiki and its ticket queues (see Product).
 */
final class ProductManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ProductRepository $products,
        private readonly SluggerInterface $slugger,
        private readonly ProductIcons $icons,
    ) {
    }

    /** @throws SlugTakenException */
    public function create(ProductRequest $request): Product
    {
        $name = trim($request->name);
        if ($request->slug && $this->products->slugExists($request->slug)) {
            throw new SlugTakenException($request->slug);
        }
        $product = new Product($name, $request->slug ?: $this->availableSlug($this->slugger->slug($name)->lower()->toString()));
        $this->apply($product, $request, $product->getSlug());
        $this->em->persist($product);
        $this->em->flush();

        return $product;
    }

    /** @throws SlugTakenException */
    public function update(Product $product, ProductRequest $request): void
    {
        $slug = $request->slug ?: $product->getSlug();
        if ($this->products->slugExists($slug, $product)) {
            throw new SlugTakenException($slug);
        }
        $this->apply($product, $request, $slug);
        $this->em->flush();
    }

    public function delete(Product $product): void
    {
        $icon = $product->getIconFile();
        $this->em->remove($product);
        $this->em->flush();
        $this->icons->delete($icon);
    }

    private function apply(Product $product, ProductRequest $request, string $slug): void
    {
        $product->update(
            trim($request->name),
            $slug,
            trim($request->tagline),
            $request->homepage,
            $request->repositoryUrl ?: null,
            $request->published,
        );
    }

    /**
     * A generated slug gets a suffix when taken (a slug chosen by the admin must be free).
     *
     * @throws SlugTakenException
     */
    private function availableSlug(string $slug): string
    {
        if ('' === $slug) {
            $slug = 'produit';
        }
        if (!$this->products->slugExists($slug)) {
            return $slug;
        }
        for ($i = 2; $i < 100; ++$i) {
            if (!$this->products->slugExists("$slug-$i")) {
                return "$slug-$i";
            }
        }

        throw new SlugTakenException($slug);
    }
}

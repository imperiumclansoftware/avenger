<?php

namespace App\Product;

use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Icons of the products: files under a random name, served by IconController.
 */
final class ProductIcons
{
    /** Accepted types => extension of the stored file */
    public const TYPES = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/svg+xml' => 'svg',
    ];

    /** File names handed out by this class */
    public const FILE_PATTERN = '[a-f0-9]{32}\.(?:png|jpg|webp|gif|svg)';

    public function __construct(
        private readonly EntityManagerInterface $em,
        #[Autowire('%kernel.project_dir%/var/icons/%kernel.environment%')]
        private readonly string $directory,
        private readonly Filesystem $filesystem = new Filesystem(),
    ) {
    }

    /**
     * Replaces the icon of the product. The type was checked by the controller's constraints.
     *
     * @throws InvalidIconException
     */
    public function replace(Product $product, UploadedFile $upload): void
    {
        $extension = self::TYPES[(string) $upload->getMimeType()] ?? throw new InvalidIconException('Format d\'image non pris en charge.');
        if ('svg' === $extension) {
            $this->assertSafeSvg((string) file_get_contents($upload->getPathname()));
        }

        $file = bin2hex(random_bytes(16)).'.'.$extension;
        $this->filesystem->mkdir($this->directory);
        $upload->move($this->directory, $file);

        $previous = $product->getIconFile();
        $product->setIconFile($file);
        $this->em->flush();
        $this->delete($previous);
    }

    public function remove(Product $product): void
    {
        $previous = $product->getIconFile();
        $product->setIconFile(null);
        $this->em->flush();
        $this->delete($previous);
    }

    /** Path of an icon file, or null when it does not exist. */
    public function path(string $file): ?string
    {
        if (1 !== preg_match('/^'.self::FILE_PATTERN.'$/', $file)) {
            return null;
        }
        $path = $this->directory.'/'.$file;

        return is_file($path) ? $path : null;
    }

    public function delete(?string $file): void
    {
        if (null !== $file && null !== $path = $this->path($file)) {
            $this->filesystem->remove($path);
        }
    }

    /**
     * SVG icons are shown with <img> and served in a sandbox (IconController), where no script
     * runs. Still refuse those that carry active content: nothing of it belongs in an icon.
     *
     * @throws InvalidIconException
     */
    private function assertSafeSvg(string $svg): void
    {
        $previous = libxml_use_internal_errors(true);
        $document = new \DOMDocument();
        $loaded = '' !== trim($svg) && $document->loadXML($svg, \LIBXML_NONET);
        libxml_use_internal_errors($previous);

        if (!$loaded || 'svg' !== $document->documentElement?->localName) {
            throw new InvalidIconException('Ce fichier SVG n\'est pas valide.');
        }
        if (1 === preg_match('/<\s*(script|foreignObject|iframe|embed|object)\b|\son[a-z]+\s*=|javascript:|<!ENTITY/i', $svg)) {
            throw new InvalidIconException('Ce SVG contient du contenu actif (script, événement, entité) : il n\'est pas accepté.');
        }
    }
}

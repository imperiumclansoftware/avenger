<?php

namespace App\Controller;

use App\Product\ProductIcons;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Icons of the products. Public: their names are random. Served in a sandbox, so that an SVG
 * opened directly cannot run anything on Avenger's origin.
 */
final class IconController extends AbstractController
{
    #[Route('/api/icons/{file}', name: 'api_icon', requirements: ['file' => ProductIcons::FILE_PATTERN], methods: ['GET'])]
    public function show(string $file, ProductIcons $icons): BinaryFileResponse
    {
        $path = $icons->path($file) ?? throw new NotFoundHttpException('Icône introuvable.');

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', array_search(pathinfo($file, \PATHINFO_EXTENSION), ProductIcons::TYPES, true) ?: 'application/octet-stream');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
        // A new icon gets a new name: this one never changes
        $response->setPublic();
        $response->setMaxAge(31536000);
        $response->headers->addCacheControlDirective('immutable');

        return $response;
    }
}

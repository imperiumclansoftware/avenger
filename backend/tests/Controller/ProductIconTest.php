<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ProductIconTest extends ApiTestCase
{
    private const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#b4532a"/></svg>';

    /** @var list<string> */
    private array $tempFiles = [];

    protected function tearDown(): void
    {
        array_map(unlink(...), array_filter($this->tempFiles, is_file(...)));
        parent::tearDown();
    }

    public function testAnIconIsUploadedAndServedInASandbox(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];

        $product = $this->upload($id, $this->png());
        self::assertResponseIsSuccessful();
        self::assertMatchesRegularExpression('#^api/icons/[a-f0-9]{32}\.png$#', $product['iconUrl']);
        self::assertSame($product['iconUrl'], $this->request('GET', '/api/products/mjolnir')['iconUrl'], 'Shown in the public area');
        self::assertSame($product['iconUrl'], $this->request('GET', '/api/products')[0]['iconUrl']);

        $this->client->request('GET', '/'.$product['iconUrl']);
        $response = $this->client->getResponse();
        self::assertResponseIsSuccessful();
        self::assertSame('image/png', $response->headers->get('Content-Type'));
        self::assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        self::assertStringContainsString('sandbox', (string) $response->headers->get('Content-Security-Policy'));
        self::assertStringContainsString('immutable', (string) $response->headers->get('Cache-Control'));
    }

    public function testASvgIconReplacesThePreviousOne(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $first = $this->upload($id, $this->png())['iconUrl'];

        $second = $this->upload($id, $this->file(self::SVG, 'icon.svg'))['iconUrl'];
        self::assertStringEndsWith('.svg', $second);
        $this->client->request('GET', '/'.$second);
        self::assertSame('image/svg+xml', $this->client->getResponse()->headers->get('Content-Type'));

        // The previous file is gone
        $this->client->request('GET', '/'.$first);
        self::assertResponseStatusCodeSame(404);
    }

    public function testFilesThatAreNotSafeImagesAreRefused(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];

        foreach ([
            'texte' => $this->file('pas une image', 'icon.txt'),
            'script' => $this->file('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'icon.svg'),
            'événement' => $this->file('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>', 'icon.svg'),
            'trop lourd' => $this->file(str_repeat('x', 1_100_000), 'icon.png'),
        ] as $case => $file) {
            $response = $this->upload($id, $file);
            self::assertResponseStatusCodeSame(422, $case);
            self::assertSame('icon', $response['violations'][0]['propertyPath'], $case);
        }
        self::assertNull($this->request('GET', "/api/admin/products/$id")['iconUrl']);
    }

    public function testRemovingTheIcon(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $icon = $this->upload($id, $this->png())['iconUrl'];

        self::assertNull($this->request('DELETE', "/api/admin/products/$id/icon")['iconUrl']);
        $this->client->request('GET', '/'.$icon);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeletingTheProductDeletesItsIcon(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $icon = $this->upload($id, $this->png())['iconUrl'];

        $this->request('DELETE', "/api/admin/products/$id");
        $this->client->request('GET', '/'.$icon);
        self::assertResponseStatusCodeSame(404);
    }

    public function testOnlyAdministratorsChangeIcons(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');

        $this->upload($id, $this->png());
        self::assertResponseStatusCodeSame(401);
    }

    private function upload(int $id, UploadedFile $file): mixed
    {
        $this->client->request('POST', "/api/admin/products/$id/icon", files: ['icon' => $file], server: ['HTTP_ACCEPT' => 'application/json']);

        return json_decode((string) $this->client->getResponse()->getContent(), true);
    }

    private function png(): UploadedFile
    {
        $image = imagecreatetruecolor(8, 8);
        ob_start();
        imagepng($image);

        return $this->file((string) ob_get_clean(), 'icon.png');
    }

    private function file(string $content, string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'icon');
        file_put_contents($path, $content);
        $this->tempFiles[] = $path;

        return new UploadedFile($path, $name, test: true);
    }
}

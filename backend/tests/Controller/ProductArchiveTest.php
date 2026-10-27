<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ProductArchiveTest extends ApiTestCase
{
    private const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#0f0e0d"/></svg>';

    public function testAProductMovesWithItsIconWikiAndTickets(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->uploadIcon($id, self::SVG);
        $this->request('POST', "/api/admin/products/$id/wiki", ['title' => 'Installation', 'content' => '## Prérequis']);
        $home = $this->request('GET', "/api/admin/products/$id")['wikiPages'][0]['id'];
        $this->request('PUT', "/api/admin/products/$id/wiki/$home", ['title' => 'Bienvenue', 'content' => 'Accueil du wiki']);
        $this->openTicket('bug', 'Le marteau ne revient pas');
        $this->openTicket('feature', 'Mode vol');
        $this->request('PUT', "/api/admin/products/$id/tickets/1", ['status' => 'resolved', 'type' => 'bug']);

        $archive = $this->export($id, tickets: true);
        self::assertSame(['avenger-product', 1], [$archive['format'], $archive['version']]);
        self::assertStringStartsWith('attachment; filename=avenger-mjolnir-', (string) $this->client->getResponse()->headers->get('Content-Disposition'));
        self::assertSame(self::SVG, base64_decode($archive['product']['icon']['data']));

        // Moved: deleted here, imported again (as on another Avenger)
        $this->request('DELETE', "/api/admin/products/$id");
        $imported = $this->request('POST', '/api/admin/products/import', $archive);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('mjolnir', $imported['slug']);
        self::assertFalse($imported['published'], 'A draft, to check before publishing');
        self::assertSame($archive['product']['createdAt'], $imported['createdAt']);
        self::assertNotNull($imported['iconUrl']);
        $this->client->request('GET', '/'.$imported['iconUrl']);
        self::assertSame(self::SVG, $this->client->getInternalResponse()->getContent());

        self::assertSame(['Bienvenue', 'Installation'], array_column($imported['wikiPages'], 'title'));
        self::assertSame([true, false], array_column($imported['wikiPages'], 'home'));
        $newId = $imported['id'];
        $tickets = $this->request('GET', "/api/admin/products/$newId/tickets");
        self::assertSame([[2, 'feature', 'new'], [1, 'bug', 'resolved']], array_map(static fn ($t) => [$t['number'], $t['type'], $t['status']], $tickets));
        self::assertSame('thor@asgard.example', $tickets[0]['authorEmail']);

        // Numbering goes on after the imported tickets
        $this->request('PUT', "/api/admin/products/$newId", ['name' => 'Mjolnir', 'slug' => 'mjolnir', 'published' => true]);
        self::assertSame(3, $this->openTicket('bug', 'Après le déménagement')['number']);

        // And the export of the import is the same product
        $again = $this->export($newId, tickets: false);
        self::assertSame($archive['wiki'], $again['wiki']);
    }

    public function testTheTicketsAndTheirEmailsOnlyWhenAsked(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->openTicket('bug', 'Un bug');

        $archive = $this->export($id, tickets: false);
        self::assertSame([], $archive['tickets']);
        self::assertStringNotContainsString('asgard', (string) $this->client->getResponse()->getContent());
        self::assertSame(1, $archive['ticketCounter'], 'Numbers already given are never given again');
    }

    public function testATakenAddressAsksForAnother(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $archive = $this->export($id, tickets: false);

        $response = $this->request('POST', '/api/admin/products/import', $archive);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('slug', $response['violations'][0]['propertyPath']);

        self::assertSame('mjolnir-v2', $this->request('POST', '/api/admin/products/import?slug=mjolnir-v2', $archive)['slug']);
        self::assertResponseStatusCodeSame(201);
    }

    public function testFilesThatAreNotValidExportsCreateNothing(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $archive = $this->export($id, tickets: false);
        $this->request('DELETE', "/api/admin/products/$id");

        $cases = [
            'pas un export' => ['format' => 'autre chose', 'version' => 1, 'product' => $archive['product']],
            'version future' => ['version' => 2] + $archive,
            'svg piégé' => ['product' => ['icon' => ['data' => base64_encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')]] + $archive['product']] + $archive,
            'tickets en double' => ['tickets' => array_fill(0, 2, ['number' => 1, 'type' => 'bug', 'status' => 'new', 'title' => 'T', 'description' => '', 'authorName' => 'A', 'authorEmail' => 'a@example.org'])] + $archive,
            'champ invalide' => ['wiki' => [['title' => '', 'slug' => 'Pas Valide', 'content' => '']]] + $archive,
        ];
        foreach ($cases as $case => $body) {
            $response = $this->request('POST', '/api/admin/products/import', $body);
            self::assertResponseStatusCodeSame(422, $case);
            self::assertNotEmpty($response['violations'], $case);
        }
        self::assertSame([], $this->request('GET', '/api/admin/products'));

        // The messages of the constraints are in French
        $response = $this->request('POST', '/api/admin/products/import', $cases['champ invalide']);
        self::assertContains('Cette valeur ne doit pas être vide.', array_column($response['violations'], 'title'));
    }

    public function testOnlyAdministrators(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');

        $this->request('GET', "/api/admin/products/$id/export");
        self::assertResponseStatusCodeSame(401);
        $this->request('POST', '/api/admin/products/import', ['format' => 'avenger-product']);
        self::assertResponseStatusCodeSame(401);
    }

    /** @return array<string, mixed> */
    private function export(int $id, bool $tickets): array
    {
        $this->client->request('GET', "/api/admin/products/$id/export".($tickets ? '?tickets=1' : ''));
        self::assertResponseIsSuccessful();

        return json_decode((string) $this->client->getResponse()->getContent(), true);
    }

    /** @return array<string, mixed> */
    private function openTicket(string $type, string $title): array
    {
        return $this->request('POST', '/api/products/mjolnir/tickets', ['type' => $type, 'title' => $title, 'description' => 'Détails', 'authorName' => 'Thor', 'authorEmail' => 'thor@asgard.example']);
    }

    private function uploadIcon(int $id, string $svg): void
    {
        $path = tempnam(sys_get_temp_dir(), 'icon');
        file_put_contents($path, $svg);
        $this->client->request('POST', "/api/admin/products/$id/icon", files: ['icon' => new UploadedFile($path, 'icon.svg', test: true)], server: ['HTTP_ACCEPT' => 'application/json']);
        self::assertResponseIsSuccessful();
    }
}

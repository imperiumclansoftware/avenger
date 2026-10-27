<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class AdminWikiAndTicketTest extends ApiTestCase
{
    public function testWikiPages(): void
    {
        $this->loginAsAdmin();
        $product = $this->createProduct();
        $id = $product['id'];

        $page = $this->request('POST', "/api/admin/products/$id/wiki", ['title' => 'Guide d\'installation', 'content' => '## Prérequis']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('guide-d-installation', $page['slug']);

        $this->request('POST', "/api/admin/products/$id/wiki", ['title' => 'Doublon', 'slug' => 'guide-d-installation']);
        self::assertResponseStatusCodeSame(422);

        $updated = $this->request('PUT', "/api/admin/products/$id/wiki/{$page['id']}", ['title' => 'Installation', 'slug' => 'installation', 'content' => 'Nouveau']);
        self::assertSame('installation', $updated['slug']);
        self::assertSame('Nouveau', $this->request('GET', '/api/products/mjolnir/wiki/installation')['content']);

        // The home page keeps its address and cannot be deleted
        $homeId = $product['wikiPages'][0]['id'];
        self::assertSame('accueil', $this->request('PUT', "/api/admin/products/$id/wiki/$homeId", ['title' => 'Accueil', 'slug' => 'autre', 'content' => 'x'])['slug']);
        $this->request('DELETE', "/api/admin/products/$id/wiki/$homeId");
        self::assertResponseStatusCodeSame(422);

        $this->request('DELETE', "/api/admin/products/$id/wiki/{$page['id']}");
        self::assertResponseStatusCodeSame(204);
        self::assertSame(['accueil'], array_column($this->request('GET', "/api/admin/products/$id")['wikiPages'], 'slug'));
    }

    public function testThePagesAreListedHomeFirstThenAlphabetically(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        foreach (['Zèbre', 'Événements', 'API', 'bonjour'] as $title) {
            $this->request('POST', "/api/admin/products/$id/wiki", ['title' => $title]);
        }

        $titles = array_column($this->request('GET', '/api/products/mjolnir')['wikiPages'], 'title');
        self::assertSame(['Accueil', 'API', 'bonjour', 'Événements', 'Zèbre'], $titles);
    }

    public function testAWikiPageOfAnotherProductIsNotFound(): void
    {
        $this->loginAsAdmin();
        $first = $this->createProduct('Mjolnir');
        $other = $this->createProduct('Stormbreaker');

        $this->request('GET', "/api/admin/products/{$first['id']}/wiki/{$other['wikiPages'][0]['id']}");
        self::assertResponseStatusCodeSame(404);
    }

    public function testHandlingATicket(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'bug', 'title' => 'Ajouter un mode vol', 'description' => 'D', 'authorName' => 'Thor', 'authorEmail' => 'thor@example.org']);

        $tickets = $this->request('GET', "/api/admin/products/$id/tickets");
        self::assertSame('thor@example.org', $tickets[0]['authorEmail']);

        // It is a feature request rather than a bug
        $ticket = $this->request('PUT', "/api/admin/products/$id/tickets/1", ['status' => 'accepted', 'type' => 'feature']);
        self::assertResponseIsSuccessful();
        self::assertSame(['accepted', 'feature'], [$ticket['status'], $ticket['type']]);
        self::assertSame([], $this->request('GET', "/api/admin/products/$id/tickets?type=bug"));

        $this->request('PUT', "/api/admin/products/$id/tickets/99", ['status' => 'closed', 'type' => 'bug']);
        self::assertResponseStatusCodeSame(404);

        $this->request('DELETE', "/api/admin/products/$id/tickets/1");
        self::assertResponseStatusCodeSame(204);
    }
}

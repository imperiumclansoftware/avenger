<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class PublicAreaTest extends ApiTestCase
{
    public function testOnlyPublishedProductsAreShown(): void
    {
        $this->loginAsAdmin();
        $this->createProduct('Mjolnir');
        $this->createProduct('Brouillon', published: false);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');

        $products = $this->request('GET', '/api/products');
        self::assertSame(['mjolnir'], array_column($products, 'slug'));
        self::assertSame([1, 0], [$products[0]['wikiPageCount'], $products[0]['openTicketCount']]);
        $this->request('GET', '/api/products/brouillon');
        self::assertResponseStatusCodeSame(404);

        $product = $this->request('GET', '/api/products/mjolnir');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('# Mjolnir', $product['homepage']);
    }

    public function testTheWikiHomePage(): void
    {
        $this->loginAsAdmin();
        $this->createProduct();

        $page = $this->request('GET', '/api/products/mjolnir/wiki/accueil');
        self::assertResponseIsSuccessful();
        self::assertSame('Accueil', $page['title']);
        $this->request('GET', '/api/products/mjolnir/wiki/inconnue');
        self::assertResponseStatusCodeSame(404);
    }

    public function testAnyoneCanOpenATicketNumberedPerProduct(): void
    {
        $this->loginAsAdmin();
        $this->createProduct('Mjolnir');
        $this->createProduct('Stormbreaker');
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');

        $ticket = ['type' => 'bug', 'title' => 'Le marteau ne revient pas', 'description' => 'Étapes…', 'authorName' => 'Thor', 'authorEmail' => 'Thor@Asgard.example'];
        self::assertSame(1, $this->request('POST', '/api/products/mjolnir/tickets', $ticket)['number']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(2, $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'feature'] + $ticket)['number']);
        self::assertSame(1, $this->request('POST', '/api/products/stormbreaker/tickets', $ticket)['number']);

        $tickets = $this->request('GET', '/api/products/mjolnir/tickets');
        self::assertSame([2, 1], array_column($tickets, 'number'));
        self::assertArrayNotHasKey('authorEmail', $tickets[0], 'The e-mail of the author stays private');

        self::assertSame([1], array_column($this->request('GET', '/api/products/mjolnir/tickets?type=bug'), 'number'));
        self::assertSame('Thor', $this->request('GET', '/api/products/mjolnir/tickets/1')['authorName']);

        $queues = $this->request('GET', '/api/products/mjolnir')['queues'];
        self::assertSame(['bug' => 1, 'feedback' => 0, 'feature' => 1], array_column($queues, 'openCount', 'type'));
    }

    public function testTicketValidation(): void
    {
        $this->loginAsAdmin();
        $this->createProduct();

        $response = $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'bug', 'title' => '', 'description' => 'D', 'authorName' => 'Thor', 'authorEmail' => 'pas-un-email']);
        self::assertResponseStatusCodeSame(422);
        self::assertEqualsCanonicalizing(['title', 'authorEmail'], array_column($response['violations'], 'propertyPath'));

        $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'inconnu', 'title' => 'T', 'description' => 'D', 'authorName' => 'Thor', 'authorEmail' => 'thor@example.org']);
        self::assertResponseStatusCodeSame(422);
    }
}

<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class AdminProductControllerTest extends ApiTestCase
{
    public function testThePrivateAreaRequiresAnAdministrator(): void
    {
        $this->request('GET', '/api/admin/products');
        self::assertResponseStatusCodeSame(401);
    }

    public function testCreatingAProductCreatesItsWikiAndTicketQueues(): void
    {
        $this->loginAsAdmin();
        $product = $this->createProduct('Mjölnir Core');

        self::assertResponseStatusCodeSame(201);
        self::assertSame('mjolnir-core', $product['slug']);
        self::assertSame([['id' => $product['wikiPages'][0]['id'], 'slug' => 'accueil', 'title' => 'Accueil', 'home' => true]], $product['wikiPages']);
        self::assertSame(['bug', 'feedback', 'feature'], array_column($product['queues'], 'type'));
        self::assertSame([0, 0, 0], array_column($product['queues'], 'openCount'));
    }

    public function testAGeneratedSlugGetsASuffixButAChosenOneMustBeFree(): void
    {
        $this->loginAsAdmin();
        $this->createProduct('Mjolnir');
        self::assertSame('mjolnir-2', $this->createProduct('Mjolnir')['slug']);

        $response = $this->request('POST', '/api/admin/products', ['name' => 'Autre', 'slug' => 'mjolnir']);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('slug', $response['violations'][0]['propertyPath']);
    }

    public function testUpdatingTheHomepage(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];

        $product = $this->request('PUT', "/api/admin/products/$id", ['name' => 'Mjolnir', 'slug' => 'mjolnir', 'homepage' => '# Nouvelle page', 'published' => false]);
        self::assertResponseIsSuccessful();
        self::assertSame('# Nouvelle page', $product['homepage']);
        self::assertFalse($product['published']);
    }

    public function testDeletingAProduct(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'bug', 'title' => 'T', 'description' => 'D', 'authorName' => 'Tony', 'authorEmail' => 'tony@example.org']);

        $this->request('DELETE', "/api/admin/products/$id");
        self::assertResponseStatusCodeSame(204);
        $this->request('GET', "/api/admin/products/$id");
        self::assertResponseStatusCodeSame(404);
    }

    public function testValidation(): void
    {
        $this->loginAsAdmin();
        $response = $this->request('POST', '/api/admin/products', ['name' => '', 'repositoryUrl' => 'pas une url']);
        self::assertResponseStatusCodeSame(422);
        self::assertEqualsCanonicalizing(['name', 'repositoryUrl'], array_column($response['violations'], 'propertyPath'));
    }
}

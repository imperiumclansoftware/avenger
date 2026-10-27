<?php

namespace App\Tests;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Functional test on an empty database, with JSON helpers.
 */
abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = $this->em();
        $tool = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($metadata);
        $tool->createSchema($metadata);
    }

    protected function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    /** Logs in as an administrator: the next requests carry the JWT. */
    protected function loginAsAdmin(): void
    {
        $user = new User('admin@example.org');
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword(static::getContainer()->get('security.user_password_hasher')->hashPassword($user, 'correct horse battery'));
        $this->em()->persist($user);
        $this->em()->flush();

        $response = $this->request('POST', '/api/login', ['email' => 'admin@example.org', 'password' => 'correct horse battery']);
        self::assertResponseIsSuccessful();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$response['token']);
    }

    protected function request(string $method, string $uri, ?array $body = null): mixed
    {
        $this->client->request($method, $uri, server: ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], content: null === $body ? null : json_encode($body));
        $content = $this->client->getResponse()->getContent();

        return '' === $content ? null : json_decode($content, true);
    }

    /** Creates a product from the private area and returns it. */
    protected function createProduct(string $name = 'Mjolnir', bool $published = true): array
    {
        return $this->request('POST', '/api/admin/products', [
            'name' => $name,
            'tagline' => 'Un marteau open source',
            'homepage' => "# $name\n\nPrésentation.",
            'repositoryUrl' => 'https://github.com/example/mjolnir',
            'published' => $published,
        ]);
    }
}

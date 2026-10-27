<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class UserManagementTest extends ApiTestCase
{
    public function testAdministratorsAreAddedAndRemoved(): void
    {
        $this->loginAsAdmin();
        $created = $this->request('POST', '/api/admin/users', ['email' => 'Loki@Example.org', 'password' => 'un mot de passe solide']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['loki@example.org', true, true], [$created['email'], $created['admin'], $created['notifyNewTickets']]);
        self::assertSame(['admin@example.org', 'loki@example.org'], array_column($this->request('GET', '/api/admin/users'), 'email'));

        $this->request('POST', '/api/admin/users', ['email' => 'loki@example.org', 'password' => 'un mot de passe solide']);
        self::assertResponseStatusCodeSame(422);

        // The new administrator can log in
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');
        self::assertArrayHasKey('token', $this->request('POST', '/api/login', ['email' => 'loki@example.org', 'password' => 'un mot de passe solide']));
    }

    public function testNobodyRemovesTheirOwnAccount(): void
    {
        $this->loginAsAdmin();
        $me = $this->request('GET', '/api/me');
        $other = $this->request('POST', '/api/admin/users', ['email' => 'loki@example.org', 'password' => 'un mot de passe solide']);

        $refused = $this->request('DELETE', '/api/admin/users/'.$me['id']);
        self::assertResponseStatusCodeSame(409);
        self::assertStringContainsString('propre compte', $refused['detail']);

        $this->request('DELETE', '/api/admin/users/'.$other['id']);
        self::assertResponseStatusCodeSame(204);
        self::assertSame(['admin@example.org'], array_column($this->request('GET', '/api/admin/users'), 'email'));
    }

    public function testChangingMyPassword(): void
    {
        $this->loginAsAdmin();
        $response = $this->request('PUT', '/api/me/password', ['currentPassword' => 'pas le bon', 'newPassword' => 'nouvelle phrase de passe']);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('currentPassword', $response['violations'][0]['propertyPath']);

        $this->request('PUT', '/api/me/password', ['currentPassword' => 'correct horse battery', 'newPassword' => 'nouvelle phrase de passe']);
        self::assertResponseIsSuccessful();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');
        self::assertArrayHasKey('token', $this->request('POST', '/api/login', ['email' => 'admin@example.org', 'password' => 'nouvelle phrase de passe']));
    }

    public function testOnlyAdministrators(): void
    {
        foreach (['/api/admin/users', '/api/admin/settings'] as $uri) {
            $this->request('GET', $uri);
            self::assertResponseStatusCodeSame(401, $uri);
        }
        $this->request('PUT', '/api/me/password', ['currentPassword' => 'x', 'newPassword' => 'y']);
        self::assertResponseStatusCodeSame(401);
    }
}

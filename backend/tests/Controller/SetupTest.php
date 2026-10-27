<?php

namespace App\Tests\Controller;

use App\Setup\SetupCode;
use App\Tests\ApiTestCase;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

final class SetupTest extends ApiTestCase
{
    public function testTheWizardCreatesTheFirstAdministratorOnce(): void
    {
        self::assertSame(['installed' => false], $this->request('GET', '/api/setup'));
        $code = static::getContainer()->get(SetupCode::class)->current();

        // The code is checked before the account is asked for
        $refused = $this->request('POST', '/api/setup/verify', ['code' => 'MAUV-AISC']);
        self::assertResponseStatusCodeSame(403);
        // Said in the response itself: in production, the message of an exception would be hidden
        self::assertStringStartsWith('Code d\'installation incorrect.', $refused['detail']);
        $this->request('POST', '/api/setup/verify', ['code' => strtolower($code)]);
        self::assertResponseStatusCodeSame(204, 'Case and dash do not matter');

        $result = $this->request('POST', '/api/setup', ['code' => $code, 'email' => 'Admin@Example.org', 'password' => 'un mot de passe solide']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['email' => 'admin@example.org', 'admin' => true], array_intersect_key($result['user'], ['email' => 1, 'admin' => 1]));

        // The administrator is logged in right away, and can log in again later
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$result['token']);
        $this->request('GET', '/api/admin/products');
        self::assertResponseIsSuccessful();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');
        self::assertArrayHasKey('token', $this->request('POST', '/api/login', ['email' => 'admin@example.org', 'password' => 'un mot de passe solide']));

        // Then the wizard is closed
        self::assertSame(['installed' => true], $this->request('GET', '/api/setup'));
        $conflict = $this->request('POST', '/api/setup', ['code' => $code, 'email' => 'other@example.org', 'password' => 'un mot de passe solide']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('Avenger est déjà installé.', $conflict['detail']);
        $this->request('POST', '/api/setup/verify', ['code' => $code]);
        self::assertResponseStatusCodeSame(409);
    }

    public function testAWrongCodeCreatesNothing(): void
    {
        $this->request('POST', '/api/setup', ['code' => 'MAUV-AISC', 'email' => 'admin@example.org', 'password' => 'un mot de passe solide']);
        self::assertResponseStatusCodeSame(403);
        self::assertSame(['installed' => false], $this->request('GET', '/api/setup'));
    }

    public function testTheAccountIsValidated(): void
    {
        $code = static::getContainer()->get(SetupCode::class)->current();

        $response = $this->request('POST', '/api/setup', ['code' => $code, 'email' => 'pas-un-email', 'password' => 'court']);
        self::assertResponseStatusCodeSame(422);
        self::assertEqualsCanonicalizing(['email', 'password'], array_column($response['violations'], 'propertyPath'));
    }

    public function testTheCodeIsGivenOnTheServerUntilInstalled(): void
    {
        $code = static::getContainer()->get(SetupCode::class)->current();
        self::assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/', $code);

        $tester = new CommandTester((new Application(static::$kernel))->find('app:setup:code'));
        $tester->execute([]);
        self::assertStringContainsString($code, $tester->getDisplay());

        $this->loginAsAdmin();
        $tester->execute([]);
        self::assertStringContainsString('déjà installé', $tester->getDisplay());
    }
}

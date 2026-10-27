<?php

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;
use Symfony\Component\Mime\Email;

final class MailAndNotificationsTest extends ApiTestCase
{
    public function testTheMailServerIsSetUpWithoutTheBrowserSeeingThePassword(): void
    {
        $this->loginAsAdmin();
        self::assertFalse($this->request('GET', '/api/admin/settings')['mail']['configured']);

        $settings = $this->request('PUT', '/api/admin/settings/mail', $this->smtp(['password' => 'secret-smtp']));
        self::assertResponseIsSuccessful();
        self::assertSame(['smtp', 'smtp.example.org', 587, true], [$settings['mail']['server']['mode'], $settings['mail']['server']['host'], $settings['mail']['server']['port'], $settings['mail']['server']['passwordSet']]);
        self::assertStringNotContainsString('secret-smtp', (string) $this->client->getResponse()->getContent());

        // Saved again without password: kept for the same account on the same server
        self::assertTrue($this->request('PUT', '/api/admin/settings/mail', $this->smtp())['mail']['server']['passwordSet']);
        // Another server: the password is not sent there
        self::assertFalse($this->request('PUT', '/api/admin/settings/mail', $this->smtp(['host' => 'smtp.autre.example']))['mail']['server']['passwordSet']);
    }

    public function testTheTestEmailGoesThroughTheServerOfTheForm(): void
    {
        $this->loginAsAdmin();
        $result = $this->request('POST', '/api/admin/mail/test', ['mode' => 'custom', 'dsn' => 'null://null', 'from' => 'avenger@example.org', 'recipient' => 'moi@example.org']);
        self::assertTrue($result['ok'], json_encode($result));
        self::assertEmailCount(1);
        self::assertSame('moi@example.org', self::getMailerMessage()->getTo()[0]->getAddress());

        $result = $this->request('POST', '/api/admin/mail/test', ['mode' => 'smtp', 'host' => 'smtp.example.org']);
        self::assertFalse($result['ok']);
        self::assertSame('Expéditeur', $result['checks'][0]['label']);
    }

    public function testANewTicketNotifiesTheAdministratorsAndTheAuthor(): void
    {
        $this->loginAsAdmin();
        $this->createProduct();
        $this->configureMail();
        $this->request('PUT', '/api/admin/settings/general', ['appUrl' => 'https://avenger.example.org']);

        $this->openTicket();
        self::assertEmailCount(2);
        [$admin, $author] = self::getMailerMessages();
        self::assertInstanceOf(Email::class, $admin);
        self::assertSame('admin@example.org', $admin->getTo()[0]->getAddress());
        self::assertSame('Bugs #1 sur Mjolnir : Le marteau ne revient pas', $admin->getSubject());
        self::assertSame('thor@asgard.example', $admin->getReplyTo()[0]->getAddress(), 'Replying writes to the author');
        self::assertEmailHtmlBodyContains($admin, 'https://avenger.example.org/admin/produits/');
        self::assertSame('thor@asgard.example', $author->getTo()[0]->getAddress());
        self::assertSame('Votre ticket #1 sur Mjolnir a bien été reçu', $author->getSubject());
        self::assertEmailHtmlBodyContains($author, 'https://avenger.example.org/produits/mjolnir/tickets/1');
    }

    public function testAnAdministratorCanStopTheNewTicketEmails(): void
    {
        $this->loginAsAdmin();
        $this->createProduct();
        $this->configureMail();
        self::assertFalse($this->request('PUT', '/api/me/notifications', ['notifyNewTickets' => false])['notifyNewTickets']);

        $this->openTicket();
        self::assertEmailCount(1);
        self::assertSame('thor@asgard.example', self::getMailerMessage()->getTo()[0]->getAddress());
    }

    public function testTheAuthorLearnsTheNewStatus(): void
    {
        $this->loginAsAdmin();
        $id = $this->createProduct()['id'];
        $this->configureMail();
        $this->openTicket();

        // Moved to another queue only: nothing to tell
        $this->request('PUT', "/api/admin/products/$id/tickets/1", ['status' => 'new', 'type' => 'feature']);
        self::assertEmailCount(0);

        $this->request('PUT', "/api/admin/products/$id/tickets/1", ['status' => 'resolved', 'type' => 'feature']);
        self::assertEmailCount(1);
        self::assertSame('Votre ticket #1 sur Mjolnir : résolu', self::getMailerMessage()->getSubject());
    }

    public function testNoEmailWhileTheMailServiceIsNotConfigured(): void
    {
        $this->loginAsAdmin();
        $this->createProduct();

        $this->openTicket();
        self::assertResponseStatusCodeSame(201);
        self::assertEmailCount(0);
    }

    /** @param array<string, mixed> $override */
    private function smtp(array $override = []): array
    {
        return $override + ['mode' => 'smtp', 'host' => 'smtp.example.org', 'port' => 587, 'security' => 'starttls', 'username' => 'avenger@example.org', 'from' => 'avenger@example.org', 'fromName' => 'Avenger'];
    }

    /** A mail server that sends nothing, but whose messages the tests see */
    private function configureMail(): void
    {
        $this->request('PUT', '/api/admin/settings/mail', ['mode' => 'custom', 'dsn' => 'null://null', 'from' => 'avenger@example.org']);
        self::assertResponseIsSuccessful();
    }

    private function openTicket(): void
    {
        $this->request('POST', '/api/products/mjolnir/tickets', ['type' => 'bug', 'title' => 'Le marteau ne revient pas', 'description' => 'Étapes…', 'authorName' => 'Thor', 'authorEmail' => 'thor@asgard.example']);
    }
}

<?php

namespace App\Controller;

use App\Dto\GeneralSettingsRequest;
use App\Dto\MailSettingsRequest;
use App\Entity\User;
use App\Mail\AppMailer;
use App\Mail\MailServer;
use App\Mail\MailServerTester;
use App\Settings\AppSettings;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Server settings of the administration: mail service and public address. The secrets (password
 * of the mail server) are stored encrypted and never sent back to the browser.
 */
#[Route('/api/admin', format: 'json')]
#[IsGranted('ROLE_ADMIN')]
final class AdminSettingsController extends AbstractController
{
    public function __construct(
        private readonly AppSettings $settings,
        private readonly AppMailer $mailer,
    ) {
    }

    #[Route('/settings', name: 'api_admin_settings', methods: ['GET'])]
    public function settings(): JsonResponse
    {
        return $this->json([
            'general' => ['appUrl' => $this->plain(AppSettings::APP_URL)],
            'mail' => $this->mailSettings(),
        ]);
    }

    #[Route('/settings/general', name: 'api_admin_settings_general', methods: ['PUT'])]
    public function saveGeneral(#[MapRequestPayload] GeneralSettingsRequest $request): JsonResponse
    {
        $url = null !== $request->appUrl && '' !== trim($request->appUrl) ? rtrim(trim($request->appUrl), '/').'/' : null;
        $this->settings->set(AppSettings::APP_URL, $url);

        return $this->settings();
    }

    #[Route('/settings/mail', name: 'api_admin_settings_mail', methods: ['PUT'])]
    public function saveMail(#[MapRequestPayload] MailSettingsRequest $request): JsonResponse
    {
        // Disabled is saved explicitly, so that it also overrides MAILER_DSN from .env
        $this->settings->set(AppSettings::MAILER_DSN, $this->mailServer($request)->toDsn() ?? 'null://null');
        $this->settings->set(AppSettings::MAILER_FROM, $request->from);
        $this->settings->set(AppSettings::MAILER_FROM_NAME, $request->fromName);

        return $this->settings();
    }

    /** Back to the server of the environment (MAILER_DSN). */
    #[Route('/settings/mail/server', name: 'api_admin_settings_mail_reset', methods: ['DELETE'])]
    public function resetMailServer(): JsonResponse
    {
        $this->settings->set(AppSettings::MAILER_DSN, null);

        return $this->settings();
    }

    /** Sends a test e-mail with the values of the form, saved or not. */
    #[Route('/mail/test', name: 'api_admin_mail_test', methods: ['POST'])]
    public function testMail(#[MapRequestPayload] MailSettingsRequest $request, #[CurrentUser] User $me, MailServerTester $tester): JsonResponse
    {
        $recipient = $request->recipient ?? $me->getEmail();
        $checks = $tester->test($this->mailServer($request), $request->from, $request->fromName, trim($recipient), $me);

        return $this->json([
            'ok' => [] !== $checks && array_reduce($checks, static fn (bool $ok, array $check) => $ok && $check['ok'], true),
            'checks' => $checks,
        ]);
    }

    /** @return array<string, mixed> */
    private function mailSettings(): array
    {
        $server = MailServer::fromDsn($this->settings->get(AppSettings::MAILER_DSN));

        return [
            // null://… is accepted by the mailer but sends nothing
            'configured' => $this->mailer->isConfigured() && MailServer::DISABLED !== $server->mode,
            'source' => $this->settings->source(AppSettings::MAILER_DSN),
            'envServer' => $this->settings->hasEnvironmentValue(AppSettings::MAILER_DSN),
            'server' => [
                'mode' => $server->mode,
                'host' => $server->host,
                'port' => $server->port,
                'security' => $server->security,
                'username' => $server->username,
                'passwordSet' => null !== $server->password,
                'verifyPeer' => $server->verifyPeer,
                'customDsn' => null !== $server->customDsn ? ['set' => true, 'hint' => strstr($server->customDsn, '://', true).'://…'] : null,
            ],
            'from' => $this->plain(AppSettings::MAILER_FROM),
            'fromName' => $this->plain(AppSettings::MAILER_FROM_NAME),
        ];
    }

    /** Server described by the form; empty secrets keep the saved ones. */
    private function mailServer(MailSettingsRequest $request): MailServer
    {
        $saved = MailServer::fromDsn($this->settings->get(AppSettings::MAILER_DSN));
        $username = '' !== trim((string) $request->username) ? trim($request->username) : null;
        $password = match ($request->password) {
            // Kept only for the same account on the same server
            null => MailServer::SMTP === $saved->mode && $saved->username === $username && $saved->host === strtolower(trim((string) $request->host)) ? $saved->password : null,
            '' => null,
            default => $request->password,
        };

        return new MailServer(
            $request->mode,
            host: null !== $request->host ? strtolower(trim($request->host)) : null,
            port: $request->port,
            security: $request->security,
            username: $username,
            password: null !== $username ? $password : null,
            verifyPeer: $request->verifyPeer,
            customDsn: null !== $request->dsn && '' !== trim($request->dsn) ? trim($request->dsn) : $saved->customDsn,
        );
    }

    /** @return array{value: ?string, source: ?string} */
    private function plain(string $name): array
    {
        return ['value' => $this->settings->get($name), 'source' => $this->settings->source($name)];
    }
}

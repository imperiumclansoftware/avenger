<?php

namespace App\Mail;

use App\Entity\Ticket;
use App\Entity\User;
use App\Enum\TicketStatus;
use App\Repository\UserRepository;
use App\Settings\AppSettings;
use Psr\Log\LoggerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Symfony\Component\Mime\Address;

/**
 * E-mails sent by Avenger. Sending is best effort: a missing or failing mail service never
 * blocks the action that triggered the e-mail. The e-mails are sent once the response is gone
 * (kernel.terminate), so that a visitor opening a ticket does not wait for the mail server.
 */
final class AppMailer
{
    /** @var list<TemplatedEmail> */
    private array $queue = [];

    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly AppSettings $settings,
        private readonly UserRepository $users,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function isConfigured(): bool
    {
        return null !== $this->settings->get(AppSettings::MAILER_DSN) && null !== $this->settings->get(AppSettings::MAILER_FROM);
    }

    /**
     * A new ticket: the administrators who asked for it (replying writes to the author), and an
     * acknowledgement to the author with the link to follow the ticket.
     */
    public function ticketOpened(Ticket $ticket): void
    {
        $product = $ticket->getProduct();
        $context = [
            'ticket' => $ticket,
            'product' => $product,
            'link' => $this->link(\sprintf('produits/%s/tickets/%d', $product->getSlug(), $ticket->getNumber())),
            'adminLink' => $this->link(\sprintf('admin/produits/%d/tickets', $product->getId())),
        ];
        $subject = \sprintf('%s #%d sur %s : %s', $ticket->getQueue()->getName(), $ticket->getNumber(), $product->getName(), $ticket->getTitle());
        foreach ($this->users->findNotifiedOfNewTickets() as $admin) {
            $this->queue(
                new Address($admin->getEmail()),
                $subject,
                'ticket_new',
                $context + ['accountLink' => $this->link('admin/compte')],
                replyTo: new Address($ticket->getAuthorEmail(), $ticket->getAuthorName()),
            );
        }
        $this->queue(
            new Address($ticket->getAuthorEmail(), $ticket->getAuthorName()),
            \sprintf('Votre ticket #%d sur %s a bien été reçu', $ticket->getNumber(), $product->getName()),
            'ticket_received',
            $context,
        );
    }

    /** The author learns that their ticket was accepted, resolved, rejected… */
    public function ticketStatusChanged(Ticket $ticket, TicketStatus $previous): void
    {
        if ($previous === $ticket->getStatus()) {
            return;
        }
        $product = $ticket->getProduct();
        $this->queue(
            new Address($ticket->getAuthorEmail(), $ticket->getAuthorName()),
            \sprintf('Votre ticket #%d sur %s : %s', $ticket->getNumber(), $product->getName(), self::statusLabel($ticket->getStatus())),
            'ticket_status',
            [
                'ticket' => $ticket,
                'product' => $product,
                'status' => self::statusLabel($ticket->getStatus()),
                'link' => $this->link(\sprintf('produits/%s/tickets/%d', $product->getSlug(), $ticket->getNumber())),
            ],
        );
    }

    /**
     * Test e-mail from the administration, through a server that may not be saved yet.
     *
     * @throws TransportExceptionInterface with the reason of the failure
     */
    public function test(TransportInterface $transport, User $admin, string $recipient, string $from, ?string $fromName): void
    {
        $email = $this->email(new Address($recipient), 'E-mail de test', 'test', ['admin' => $admin], new Address($from, $fromName ?? 'Avenger'));
        $transport->send($email);
    }

    /** Sends what was queued, once the response is gone. */
    #[AsEventListener(KernelEvents::TERMINATE)]
    public function flush(): void
    {
        $queue = $this->queue;
        $this->queue = [];
        foreach ($queue as $email) {
            try {
                $this->mailer->send($email);
            } catch (TransportExceptionInterface $e) {
                $this->logger->error('Unable to send the e-mail "{subject}": {error}', [
                    'subject' => $email->getSubject(),
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public static function statusLabel(TicketStatus $status): string
    {
        return match ($status) {
            TicketStatus::New => 'nouveau',
            TicketStatus::Accepted => 'accepté',
            TicketStatus::InProgress => 'en cours',
            TicketStatus::Resolved => 'résolu',
            TicketStatus::Rejected => 'refusé',
            TicketStatus::Closed => 'fermé',
        };
    }

    /** @param array<string, mixed> $context */
    private function queue(Address $to, string $subject, string $template, array $context, ?Address $replyTo = null): void
    {
        if (!$this->isConfigured()) {
            return;
        }
        $email = $this->email($to, $subject, $template, $context);
        if (null !== $replyTo) {
            $email->replyTo($replyTo);
        }
        $this->queue[] = $email;
    }

    /** @param array<string, mixed> $context */
    private function email(Address $to, string $subject, string $template, array $context, ?Address $from = null): TemplatedEmail
    {
        $from ??= new Address((string) $this->settings->get(AppSettings::MAILER_FROM), $this->settings->get(AppSettings::MAILER_FROM_NAME) ?? 'Avenger');

        return (new TemplatedEmail())
            ->from($from)
            ->to($to)
            ->subject($subject)
            ->htmlTemplate("emails/$template.html.twig")
            ->context($context + ['recipientName' => $to->getName()]);
    }

    /** Link to a page of Avenger, when its public address is known. */
    private function link(string $path): ?string
    {
        $base = $this->settings->get(AppSettings::APP_URL);

        return null !== $base ? rtrim($base, '/').'/'.$path : null;
    }
}

<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\SetupCodeRequest;
use App\Dto\SetupRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Setup\SetupCode;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Installation wizard: creates the first administrator, once, with the installation code shown
 * on the server (logs, or bin/console app:setup:code).
 */
#[Route('/api/setup', format: 'json')]
final class SetupController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly SetupCode $code,
        #[Autowire(service: 'limiter.setup_code')]
        private readonly RateLimiterFactoryInterface $limiter,
    ) {
    }

    /** Whether the app is installed (an administrator exists); otherwise the code is ready on the server. */
    #[Route('', name: 'api_setup', methods: ['GET'])]
    public function status(): JsonResponse
    {
        $installed = $this->users->hasAccounts();
        if (!$installed) {
            $this->code->current();
        }

        return $this->json(['installed' => $installed]);
    }

    /** First step of the wizard: checks the code before asking for the account. */
    #[Route('/verify', name: 'api_setup_verify', methods: ['POST'])]
    public function verify(#[MapRequestPayload] SetupCodeRequest $request, Request $http): Response
    {
        return $this->refusal($request->code, $http) ?? new Response(status: Response::HTTP_NO_CONTENT);
    }

    #[Route('', name: 'api_setup_install', methods: ['POST'])]
    public function install(
        #[MapRequestPayload] SetupRequest $request,
        Request $http,
        LockFactory $locks,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        JWTTokenManagerInterface $jwtManager,
        ApiPresenter $presenter,
    ): JsonResponse {
        // Two wizards submitted at the same time: only one installs
        $lock = $locks->createLock('app-setup');
        $lock->acquire(true);
        try {
            if (null !== $refusal = $this->refusal($request->code, $http)) {
                return $refusal;
            }

            $admin = new User(trim($request->email));
            $admin->setRoles(['ROLE_ADMIN']);
            $admin->setPassword($hasher->hashPassword($admin, $request->password));
            $em->persist($admin);
            $em->flush();
            $this->code->clear();
        } finally {
            $lock->release();
        }

        return $this->json([
            'token' => $jwtManager->create($admin),
            'user' => $presenter->user($admin),
        ], Response::HTTP_CREATED);
    }

    /**
     * Why the wizard cannot go on, or null: already installed, too many attempts (a few per address,
     * so that the code cannot be found by trying), or a wrong code.
     */
    private function refusal(string $code, Request $http): ?JsonResponse
    {
        if ($this->users->hasAccounts()) {
            return Problem::error(Response::HTTP_CONFLICT, 'Avenger est déjà installé.');
        }
        $limit = $this->limiter->create($http->getClientIp() ?? 'unknown')->consume();
        if (!$limit->isAccepted()) {
            return Problem::error(Response::HTTP_TOO_MANY_REQUESTS, 'Trop de tentatives : réessayez dans quelques minutes.', [
                'Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time()),
            ]);
        }
        if (!$this->code->matches($code)) {
            return Problem::error(Response::HTTP_FORBIDDEN, 'Code d\'installation incorrect. Il s\'affiche dans les journaux du serveur, ou avec « bin/console app:setup:code ».');
        }

        return null;
    }
}

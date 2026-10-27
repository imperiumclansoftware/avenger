<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Logging in (POST /api/login) is handled by the "login" firewall, see security.yaml.
 */
#[Route('/api', format: 'json')]
final class AuthController extends AbstractController
{
    /** Never reached: the "login" firewall answers with the JWT, or a 401. */
    #[Route('/login', name: 'api_login', methods: ['POST'])]
    public function login(): never
    {
        throw new \LogicException('Handled by the "login" firewall.');
    }

    #[Route('/me', name: 'api_me', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function me(#[CurrentUser] User $user, ApiPresenter $presenter): JsonResponse
    {
        return $this->json($presenter->user($user));
    }
}

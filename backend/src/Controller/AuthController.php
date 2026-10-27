<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\NotificationsRequest;
use App\Dto\PasswordChangeRequest;
use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
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

    #[Route('/me/password', name: 'api_me_password', methods: ['PUT'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function changePassword(
        #[CurrentUser] User $user,
        #[MapRequestPayload] PasswordChangeRequest $request,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        ApiPresenter $presenter,
    ): JsonResponse {
        if (!$hasher->isPasswordValid($user, $request->currentPassword)) {
            return Problem::violation('currentPassword', 'Mot de passe actuel incorrect.');
        }
        $user->setPassword($hasher->hashPassword($user, $request->newPassword));
        $em->flush();

        return $this->json($presenter->user($user));
    }

    #[Route('/me/notifications', name: 'api_me_notifications', methods: ['PUT'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function notifications(#[CurrentUser] User $user, #[MapRequestPayload] NotificationsRequest $request, EntityManagerInterface $em, ApiPresenter $presenter): JsonResponse
    {
        $user->setNotifyNewTickets($request->notifyNewTickets);
        $em->flush();

        return $this->json($presenter->user($user));
    }
}

<?php

namespace App\Controller;

use App\Api\ApiPresenter;
use App\Api\Problem;
use App\Dto\UserCreateRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The administrators of the private area: an administrator adds or removes the others,
 * Avenger always keeps at least one.
 */
#[Route('/api/admin/users', format: 'json')]
#[IsGranted('ROLE_ADMIN')]
final class AdminUserController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly ApiPresenter $presenter,
    ) {
    }

    #[Route('', name: 'api_admin_users', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json(array_map($this->presenter->user(...), $this->users->findAdministrators()));
    }

    #[Route('', name: 'api_admin_user_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] UserCreateRequest $request, EntityManagerInterface $em, UserPasswordHasherInterface $hasher): JsonResponse
    {
        if (null !== $this->users->findOneByEmail(trim($request->email))) {
            return Problem::violation('email', 'Un administrateur a déjà cet e-mail.');
        }
        $user = new User(trim($request->email));
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword($hasher->hashPassword($user, $request->password));
        $em->persist($user);
        $em->flush();

        return $this->json($this->presenter->user($user), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}', name: 'api_admin_user_delete', methods: ['DELETE'])]
    public function delete(User $user, #[CurrentUser] User $me, EntityManagerInterface $em, LockFactory $locks): Response
    {
        if ($user === $me) {
            return Problem::error(Response::HTTP_CONFLICT, 'Vous ne pouvez pas retirer votre propre compte : demandez-le à un autre administrateur.');
        }
        // Two administrators removing each other at the same time: one of them stays
        $lock = $locks->createLock('admin-users');
        $lock->acquire(true);
        try {
            if (\count($this->users->findAdministrators()) <= 1) {
                return Problem::error(Response::HTTP_CONFLICT, 'Avenger doit garder au moins un administrateur.');
            }
            $em->remove($user);
            $em->flush();
        } finally {
            $lock->release();
        }

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

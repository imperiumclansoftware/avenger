<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findOneByEmail(string $email): ?User
    {
        return $this->findOneBy(['email' => mb_strtolower($email)]);
    }

    /** @return list<User> the administrators who want an e-mail for each new ticket */
    public function findNotifiedOfNewTickets(): array
    {
        return array_values(array_filter($this->findAll(), static fn (User $user) => $user->isAdmin() && $user->notifiesNewTickets()));
    }

    /** @return list<User> by e-mail */
    public function findAdministrators(): array
    {
        return array_values(array_filter($this->findBy([], ['email' => 'ASC']), static fn (User $user) => $user->isAdmin()));
    }

    /** Avenger is installed once an account exists (the first administrator). */
    public function hasAccounts(): bool
    {
        return null !== $this->createQueryBuilder('u')->select('u.id')->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(\sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->flush();
    }
}

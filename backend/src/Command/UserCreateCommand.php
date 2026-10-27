<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Creates an administrator of the private area, or changes the password of an existing one.
 */
#[AsCommand(name: 'app:admin:create', description: 'Crée un administrateur (ou change son mot de passe)')]
final class UserCreateCommand
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly ValidatorInterface $validator,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Argument('E-mail de connexion')] string $email): int
    {
        if (\count($this->validator->validate($email, [new Assert\Email()])) > 0) {
            $io->error('E-mail invalide.');

            return Command::INVALID;
        }

        $password = $io->askHidden('Mot de passe (12 caractères minimum)', static function (?string $value): string {
            if (mb_strlen((string) $value) < 12) {
                throw new \RuntimeException('Le mot de passe doit faire au moins 12 caractères.');
            }

            return $value;
        });

        $user = $this->users->findOneByEmail($email);
        $created = null === $user;
        if ($created) {
            $user = new User($email);
            $this->em->persist($user);
        }
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword($this->hasher->hashPassword($user, $password));
        $this->em->flush();

        $io->success($created ? "Administrateur $email créé." : "Mot de passe de $email changé.");

        return Command::SUCCESS;
    }
}

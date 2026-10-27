<?php

namespace App\Command;

use App\Repository\UserRepository;
use App\Setup\SetupCode;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:setup:code', description: 'Affiche le code demandé par l\'assistant d\'installation')]
final readonly class SetupCodeCommand
{
    public function __construct(
        private SetupCode $code,
        private UserRepository $users,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        if ($this->users->hasAccounts()) {
            $io->note('Avenger est déjà installé : un administrateur existe.');

            return Command::SUCCESS;
        }

        $io->success('Code d\'installation : '.$this->code->current());
        $io->text('Saisissez-le dans l\'assistant d\'installation (page /installation) pour créer le premier administrateur.');

        return Command::SUCCESS;
    }
}

<?php

namespace App\Product;

final class SlugTakenException extends \RuntimeException
{
    public function __construct(public readonly string $slug)
    {
        parent::__construct(\sprintf('L\'adresse « %s » est déjà utilisée.', $slug));
    }
}

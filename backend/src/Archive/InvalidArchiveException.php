<?php

namespace App\Archive;

/** An archive that the validation constraints let through but that cannot be imported as is. */
final class InvalidArchiveException extends \RuntimeException
{
    public function __construct(public readonly string $propertyPath, string $message)
    {
        parent::__construct($message);
    }
}

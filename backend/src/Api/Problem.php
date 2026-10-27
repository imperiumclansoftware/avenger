<?php

namespace App\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Errors in the same format as the validation errors of #[MapRequestPayload].
 *
 * Returned rather than thrown as HTTP exceptions: in production, Symfony replaces the message of
 * an exception by the status text ("Forbidden"), and the user would not know what to do.
 */
final class Problem
{
    public static function violation(string $propertyPath, string $message): JsonResponse
    {
        return new JsonResponse([
            'title' => 'Validation Failed',
            'detail' => $message,
            'violations' => [['propertyPath' => $propertyPath, 'title' => $message]],
        ], 422, ['Content-Type' => 'application/problem+json']);
    }

    public static function notFound(string $message): JsonResponse
    {
        return self::error(404, $message);
    }

    /** @param array<string, string> $headers */
    public static function error(int $status, string $message, array $headers = []): JsonResponse
    {
        return new JsonResponse(
            ['title' => Response::$statusTexts[$status] ?? 'Error', 'status' => $status, 'detail' => $message],
            $status,
            ['Content-Type' => 'application/problem+json'] + $headers,
        );
    }
}

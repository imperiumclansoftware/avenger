import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from './models';

/** Turns an API error into a message that can be shown to the user. */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue, réessayez.',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'Impossible de joindre le serveur.';
  }

  const problem = error.error as ApiProblem | null;
  if (problem?.violations?.length) {
    return problem.violations.map((v) => v.title).join(' ');
  }
  if (error.status === 401 && problem?.message === 'Invalid credentials.') {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (error.status === 404) {
    return problem?.detail ?? fallback;
  }

  return problem?.detail ?? problem?.message ?? fallback;
}

/** Validation errors of the API by field (propertyPath), e.g. { slug: 'L\'adresse est déjà utilisée.' } */
export function apiViolations(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
    return {};
  }
  const violations: Record<string, string> = {};
  for (const v of (error.error as ApiProblem | null)?.violations ?? []) {
    violations[v.propertyPath] = violations[v.propertyPath] ? `${violations[v.propertyPath]} ${v.title}` : v.title;
  }
  return violations;
}

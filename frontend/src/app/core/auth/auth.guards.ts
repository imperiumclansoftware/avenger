import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** The private area: administrators only (after the installation wizard). */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.installed())) {
    return router.createUrlTree(['/installation']);
  }
  if ((await auth.restoreSession()) && auth.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/admin/connexion'], { queryParams: { retour: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.installed())) {
    return router.createUrlTree(['/installation']);
  }
  return !(await auth.restoreSession()) || router.createUrlTree(['/admin']);
};

/** The installation wizard, only before the installation. */
export const setupGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return !(await inject(AuthService).installed()) || router.createUrlTree(['/admin/connexion']);
};

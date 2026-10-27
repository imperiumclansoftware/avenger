import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Adds the JWT to the calls of the private area and logs out when it expires. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isPrivate = req.url.startsWith('api/admin') || req.url === 'api/me';

  if (!token || !isPrivate) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && req.url !== 'api/me') {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};

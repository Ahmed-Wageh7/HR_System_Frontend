import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth endpoints that should not trigger a token refresh retry loop.
  if (
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/logout')
  ) {
    return next(req);
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      if (isRefreshing) {
        return refreshSubject.pipe(
          filter(token => token !== null),
          take(1),
          switchMap(token => next(addToken(req, token!)))
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap(token => {
          isRefreshing = false;
          refreshSubject.next(token);
          return next(addToken(req, token));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          refreshSubject.next(null);
          authService.handleSessionExpired();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

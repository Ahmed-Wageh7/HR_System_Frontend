import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap, map, of, catchError, switchMap } from "rxjs";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { TokenService } from "./token.service";
import { ApiResponse, AuthResponse, User } from "../models";

type AuthApiResponse = ApiResponse<AuthResponse> & {
  refreshToken?: string;
  accessToken?: string;
  user?: User;
};

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly userStorageKey = "hr.current_user";
  private readonly redirectStorageKey = "hr.redirect_url";
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly isLoading = signal(false);

  isAuthenticated(): boolean {
    return this.tokenService.hasToken();
  }

  getAccessToken(): string | null {
    return this.tokenService.accessToken;
  }

  getRefreshToken(): string | null {
    return this.tokenService.refreshToken;
  }

  private getEffectiveRefreshToken(): string | null {
    return (
      this.getRefreshToken() ||
      (!environment.production ? environment.devRefreshToken : null)
    );
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const perms = user.permissions ?? [];
    return perms.includes(permission) || perms.includes("*");
  }

  hasRole(roleName: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (typeof user.role === "string") return user.role === roleName;
    return (user.role as { name: string }).name === roleName;
  }

  login(credentials: { email: string; password: string }): Observable<void> {
    return this.http
      .post<AuthApiResponse>(`${this.api}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this.setSession(this.extractAuthResponse(res));
        }),
        switchMap(() =>
          this.loadProfile().pipe(
            map(() => void 0),
            catchError(() => of(void 0)),
          ),
        ),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${this.api}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        catchError(() => of(void 0)),
        map(() => void 0),
        tap(() => this.clearSession("/auth/login")),
      );
  }

  refreshToken(): Observable<string> {
    const refreshToken = this.getEffectiveRefreshToken();
    return this.http
      .post<AuthApiResponse>(
        `${this.api}/auth/refresh-token`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          this.setSession(this.extractAuthResponse(res));
        }),
        map((res) => this.extractAuthResponse(res).accessToken),
      );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.api}/auth/reset-password/${token}`, {
      password,
    });
  }

  loadProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.api}/users/profile`).pipe(
      tap((res) => this.setCurrentUser(res.data)),
      map((res) => res.data),
    );
  }

  initializeAuth(): Observable<string | null> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getEffectiveRefreshToken();
    if (!accessToken && !refreshToken) {
      return of(null);
    }

    if (!accessToken && refreshToken) {
      return this.refreshToken();
    }

    return this.loadProfile().pipe(map(() => accessToken));
  }

  storeRedirectUrl(url: string): void {
    if (!url || url.startsWith("/auth")) return;
    sessionStorage.setItem(this.redirectStorageKey, url);
  }

  consumeRedirectUrl(): string | null {
    const url = sessionStorage.getItem(this.redirectStorageKey);
    sessionStorage.removeItem(this.redirectStorageKey);
    return url;
  }

  handleSessionExpired(): void {
    this.clearSession("/auth/login");
  }

  private setSession(data: AuthResponse): void {
    this.tokenService.setTokens(data.accessToken, data.refreshToken);
    this.setCurrentUser(data.user);
  }

  private extractAuthResponse(response: AuthApiResponse): AuthResponse {
    const data = response.data ?? ({} as AuthResponse);
    const accessToken = data.accessToken || response.accessToken;
    const refreshToken = data.refreshToken || response.refreshToken;
    const user = data.user || response.user;

    return {
      accessToken: accessToken ?? "",
      refreshToken,
      user: user as User,
    };
  }

  private setCurrentUser(user: User | null): void {
    const normalizedUser = user ? this.normalizeUser(user) : null;
    this.currentUser.set(normalizedUser);
    if (normalizedUser) {
      sessionStorage.setItem(
        this.userStorageKey,
        JSON.stringify(normalizedUser),
      );
      return;
    }

    sessionStorage.removeItem(this.userStorageKey);
  }

  private getStoredUser(): User | null {
    const rawUser = sessionStorage.getItem(this.userStorageKey);
    if (!rawUser) return null;

    try {
      return this.normalizeUser(JSON.parse(rawUser) as User);
    } catch {
      sessionStorage.removeItem(this.userStorageKey);
      return null;
    }
  }

  private normalizeUser(user: User): User {
    return {
      ...user,
      avatar: this.normalizeAvatar(user.avatar),
    };
  }

  private normalizeAvatar(avatar: unknown): string | null {
    if (typeof avatar === "string") {
      return avatar;
    }

    if (avatar && typeof avatar === "object") {
      const image = avatar as {
        url?: unknown;
        path?: unknown;
        secure_url?: unknown;
      };
      if (typeof image.url === "string") {
        return image.url;
      }
      if (typeof image.path === "string") {
        return image.path;
      }
      if (typeof image.secure_url === "string") {
        return image.secure_url;
      }
    }

    return null;
  }

  private clearSession(redirectTo: string): void {
    this.tokenService.clearTokens();
    this.setCurrentUser(null);
    sessionStorage.removeItem(this.redirectStorageKey);
    this.router.navigateByUrl(redirectTo);
  }
}

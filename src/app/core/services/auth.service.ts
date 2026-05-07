import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap, map, of, catchError, switchMap } from "rxjs";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { TokenService } from "./token.service";
import { ApiResponse, AuthResponse, User } from "../models";
import { showAppToast } from "../utils/toast";

type AuthApiResponse = ApiResponse<AuthResponse> & {
  refreshToken?: string;
  accessToken?: string;
  user?: User;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
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
  private sessionExpiredNotified = false;

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
    const perms = this.collectPermissions(user);
    return perms.includes(permission) || perms.includes("*");
  }

  hasRole(roleName: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const normalizedRoleName = roleName.toLowerCase();
    const roleNames = new Set<string>();

    if (typeof user.role === "string") {
      roleNames.add(user.role.toLowerCase());
    } else if (
      user.role &&
      typeof user.role === "object" &&
      "name" in user.role
    ) {
      roleNames.add(String(user.role.name).toLowerCase());
    }

    for (const role of user.roles ?? []) {
      if (role?.name) {
        roleNames.add(role.name.toLowerCase());
      }
    }

    return roleNames.has(normalizedRoleName);
  }

  login(credentials: { email: string; password: string }): Observable<void> {
    this.sessionExpiredNotified = false;
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
      .post<void>(`${this.api}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(void 0)),
        map(() => void 0),
        tap(() => {
          this.clearSession("/auth/login");
          showAppToast("success", "Logged out successfully.");
        }),
      );
  }

  refreshToken(): Observable<string> {
    return this.http
      .post<AuthApiResponse>(
        `${this.api}/auth/refresh-token`,
        {},
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
    if (!this.sessionExpiredNotified) {
      this.sessionExpiredNotified = true;
      window.dispatchEvent(
        new CustomEvent("app:toast", {
          detail: {
            type: "error",
            message: "Session expired. Please log in again.",
          },
        }),
      );
    }
    this.clearSession("/auth/login");
  }

  private setSession(data: AuthResponse): void {
    this.tokenService.setTokens(data.accessToken, data.refreshToken);
    this.setCurrentUser(data.user);
  }

  private extractAuthResponse(response: AuthApiResponse): AuthResponse {
    const data =
      (response.data as AuthResponse & {
        tokens?: {
          accessToken?: string;
          refreshToken?: string;
        };
      }) ?? {};
    const accessToken =
      data.accessToken ||
      data.tokens?.accessToken ||
      response.accessToken ||
      response.tokens?.accessToken;
    const refreshToken =
      data.refreshToken ||
      data.tokens?.refreshToken ||
      response.refreshToken ||
      response.tokens?.refreshToken;
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

  private collectPermissions(user: User): string[] {
    const permissions = new Set<string>(user.permissions ?? []);

    const collectFromRole = (role: unknown): void => {
      if (!role || typeof role !== "object") return;
      const candidate = role as { permissions?: unknown };
      if (Array.isArray(candidate.permissions)) {
        for (const permission of candidate.permissions) {
          if (typeof permission === "string") {
            permissions.add(permission);
          }
        }
      }
    };

    collectFromRole(user.role);
    for (const role of user.roles ?? []) {
      collectFromRole(role);
    }

    return Array.from(permissions);
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

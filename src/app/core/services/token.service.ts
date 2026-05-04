import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly accessTokenStorageKey = 'hr.access_token';
  private readonly refreshTokenStorageKey = 'hr.refresh_token';
  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);

  constructor() {
    const savedAccessToken = sessionStorage.getItem(this.accessTokenStorageKey);
    const savedRefreshToken = sessionStorage.getItem(this.refreshTokenStorageKey);

    if (savedAccessToken) {
      this._accessToken.set(savedAccessToken);
    }

    if (savedRefreshToken) {
      this._refreshToken.set(savedRefreshToken);
    }
  }

  get accessToken(): string | null {
    return this._accessToken();
  }

  get refreshToken(): string | null {
    return this._refreshToken();
  }

  setTokens(accessToken: string, refreshToken?: string | null): void {
    this._accessToken.set(accessToken);
    sessionStorage.setItem(this.accessTokenStorageKey, accessToken);

    if (refreshToken) {
      this._refreshToken.set(refreshToken);
      sessionStorage.setItem(this.refreshTokenStorageKey, refreshToken);
    }
  }

  clearTokens(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    sessionStorage.removeItem(this.accessTokenStorageKey);
    sessionStorage.removeItem(this.refreshTokenStorageKey);
  }

  hasToken(): boolean {
    return this._accessToken() !== null;
  }
}

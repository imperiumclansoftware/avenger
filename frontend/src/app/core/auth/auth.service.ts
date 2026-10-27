import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, Me, SetupPayload } from '../api/models';

const TOKEN_KEY = 'avenger.token';

/** Session of the private area: a JWT kept in the browser. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(readToken());
  private readonly _user = signal<Me | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAdmin = computed(() => this._user()?.admin ?? false);
  /** Known for good once true: an installed Avenger never goes back */
  private _installed = false;

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('api/login', { email, password }),
    );
    this.storeToken(response.token);
    await this.restoreSession();
  }

  /** Whether the installation wizard has run (an administrator exists). */
  async installed(): Promise<boolean> {
    if (!this._installed) {
      try {
        this._installed = (await firstValueFrom(this.http.get<{ installed: boolean }>('api/setup'))).installed;
      } catch {
        // API unreachable: let the pages show the error
        return true;
      }
    }
    return this._installed;
  }

  /** First step of the wizard: the code shown on the server. */
  verifySetupCode(code: string): Promise<void> {
    return firstValueFrom(this.http.post<void>('api/setup/verify', { code }));
  }

  /** Creates the first administrator, logged in right away. */
  async install(payload: SetupPayload): Promise<void> {
    const response = await firstValueFrom(this.http.post<AuthResponse & { user: Me }>('api/setup', payload));
    this._installed = true;
    this.storeToken(response.token);
    this._user.set(response.user);
  }

  /** Loads the user of the stored token, if any. */
  async restoreSession(): Promise<boolean> {
    if (this._user()) {
      return true;
    }
    if (!this._token()) {
      return false;
    }
    try {
      this._user.set(await firstValueFrom(this.http.get<Me>('api/me')));
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  logout(): void {
    this.clear();
    void this.router.navigate(['/admin/connexion']);
  }

  private storeToken(token: string): void {
    this._token.set(token);
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Private browsing: the session lasts as long as the tab
    }
  }

  private clear(): void {
    this._token.set(null);
    this._user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing stored
    }
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

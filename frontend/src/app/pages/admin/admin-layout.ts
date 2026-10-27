import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="admin-header">
      <div class="container bar">
        <a routerLink="/admin" class="brand">Avenger <span>admin</span></a>
        <a routerLink="/">Voir le site</a>
        <span class="user muted">{{ auth.user()?.email }}</span>
        <button class="btn small" type="button" (click)="auth.logout()">Déconnexion</button>
      </div>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  styles: `
    .admin-header {
      position: sticky;
      top: 0;
      z-index: 10;
      margin-bottom: 2rem;
      background: rgb(4 6 12 / 0.85);
      backdrop-filter: blur(0.75rem);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 1.5rem rgb(31 98 240 / 0.12);

      a {
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--text);
        }
      }
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      min-height: 4rem;
    }
    .admin-header .brand {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.25rem;

      &,
      &:hover {
        color: var(--text);
      }

      span {
        margin-left: 0.25rem;
        padding: 0.05rem 0.5rem;
        border: 1px solid var(--accent-bright);
        border-radius: var(--radius-pill);
        color: var(--accent-bright);
        font-size: 0.75rem;
        font-weight: 600;
        vertical-align: middle;
      }
    }
    .user {
      margin-left: auto;
      font-size: 0.9rem;

      @media (width < 36rem) {
        display: none;
      }
    }
    main {
      padding-bottom: 3rem;
    }
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
}

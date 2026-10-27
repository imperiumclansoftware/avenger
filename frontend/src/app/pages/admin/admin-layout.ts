import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="admin-header">
      <div class="container bar">
        <a routerLink="/admin" class="brand">Avenger <span>admin</span></a>
        <nav class="admin-nav" aria-label="Administration">
          <a routerLink="/admin" [class.active]="onProducts()" [attr.aria-current]="onProducts() ? 'page' : null">Produits</a>
          <a routerLink="/admin/utilisateurs" routerLinkActive="active" ariaCurrentWhenActive="page">Utilisateurs</a>
          <a routerLink="/admin/email" routerLinkActive="active" ariaCurrentWhenActive="page">E-mail</a>
        </nav>
        <a routerLink="/" class="site-link">Voir le site</a>
        <a routerLink="/admin/compte" class="user" routerLinkActive="active" ariaCurrentWhenActive="page" title="Mon compte">{{ auth.user()?.email }}</a>
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
    .admin-nav {
      display: flex;
      gap: 0.25rem;

      a {
        padding: 0.35rem 0.75rem;
        border-bottom: 2px solid transparent;

        &.active {
          color: var(--text);
          border-bottom-color: var(--accent-bright);
        }
      }
    }
    .site-link {
      margin-left: auto;
    }
    .user {
      font-size: 0.9rem;

      &.active {
        color: var(--text);
      }

      @media (max-width: 36rem) {
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
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** The list and every product page */
  protected readonly onProducts = computed(() => /^\/admin(\/produits.*)?(\?.*)?$/.test(this.url()));
}

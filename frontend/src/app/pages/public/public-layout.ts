import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: `
    <div class="topbar">
      <div class="container bar">
        <span>Logiciels libres, documentés et à l'écoute de leurs utilisateurs</span>
        <a routerLink="/admin">Espace administrateurs</a>
      </div>
    </div>
    <header class="site-header">
      <nav class="container bar" aria-label="Navigation principale">
        <a routerLink="/" class="brand">
          <svg viewBox="0 0 32 24" aria-hidden="true" focusable="false">
            <path d="M10 3 2 12l8 9M22 3l8 9-8 9M18 1l-4 22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Avenger
        </a>
        <ul class="links">
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Accueil</a></li>
          <li><a routerLink="/" fragment="projets">Projets</a></li>
        </ul>
        <a class="btn primary cta" routerLink="/admin">
          {{ auth.token() ? 'Administration' : 'Connexion' }} <app-icon class="arrow" name="arrow-right" />
        </a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <p class="footer-brand">Avenger</p>
          <p class="muted">La vitrine de nos projets open source : présentation, wiki et suivi des retours de leurs utilisateurs.</p>
        </div>
        <ul class="footer-links">
          <li><a routerLink="/" fragment="projets">Tous les projets</a></li>
          <li><a routerLink="/admin">Espace administrateurs</a></li>
        </ul>
      </div>
      <div class="container copyright muted">© {{ year }} Avenger · Logiciels libres</div>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    main {
      flex: 1;
      padding-bottom: 4rem;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .topbar {
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--text-muted);

      .bar {
        justify-content: space-between;
        min-height: 2.25rem;
      }

      a {
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--text);
        }
      }

      @media (width < 40rem) {
        span {
          display: none;
        }
      }
    }
    .site-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgb(4 6 12 / 0.85);
      backdrop-filter: blur(0.75rem);
      border-bottom: 1px solid var(--border);

      .bar {
        min-height: 4.25rem;
      }
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--text);
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 700;
      text-decoration: none;

      svg {
        width: 1.9rem;
        color: var(--accent-bright);
        filter: drop-shadow(0 0 0.35rem rgb(31 98 240 / 0.9));
      }
    }
    .links {
      display: flex;
      gap: 0.25rem;
      margin: 0 0 0 auto;
      padding: 0;
      list-style: none;

      a {
        display: block;
        padding: 0.4rem 0.8rem;
        color: var(--text-muted);
        text-decoration: none;
        border-bottom: 2px solid transparent;
        transition: color 0.2s;

        &:hover {
          color: var(--text);
        }

        &.active {
          color: var(--text);
          border-bottom-color: var(--accent-bright);
        }
      }
    }
    @media (width < 32rem) {
      .links {
        display: none;
      }
      .cta {
        margin-left: auto;
      }
    }
    .site-footer {
      border-top: 1px solid var(--border);
      background: var(--bg-band);
      box-shadow: 0 -1px 1.5rem rgb(31 98 240 / 0.12);
      padding-top: 2.5rem;
    }
    .footer-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2rem;

      > div {
        max-width: 28rem;
      }
    }
    .footer-brand {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 700;
    }
    .footer-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      align-content: start;
      gap: 0.5rem;

      a {
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--text);
        }
      }
    }
    .copyright {
      margin-top: 2rem;
      padding-block: 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }
  `,
})
export class PublicLayout {
  protected readonly auth = inject(AuthService);
  protected readonly year = new Date().getFullYear();
}

import { Component, effect, inject, input, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/icon';
import { NeonWaves } from '../../shared/neon-decor';
import { ProductIcon } from '../../shared/product-icon';
import { ProductContext } from './product-context';

/** A product: its header and its tabs (presentation, wiki, tickets). */
@Component({
  selector: 'app-product-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon, NeonWaves, ProductIcon],
  providers: [ProductContext],
  template: `
    @if (context.error(); as error) {
      <div class="container missing">
        <p class="error" role="alert">{{ error }}</p>
        <a class="btn" routerLink="/"><app-icon name="arrow-left" /> Retour aux projets</a>
      </div>
    } @else if (context.product(); as product) {
      <section class="hero">
        <div class="container">
          <div class="title">
            <app-product-icon [product]="product" [size]="72" />
            <h1>{{ product.name }}</h1>
          </div>
          @if (product.tagline) {
            <p class="lead">{{ product.tagline }}</p>
          }
          <div class="actions">
            <a class="btn primary" [routerLink]="['/produits', product.slug, 'tickets', 'nouveau']">
              Ouvrir un ticket <app-icon class="arrow" name="arrow-right" />
            </a>
            @if (product.repositoryUrl) {
              <a class="btn" [href]="product.repositoryUrl" target="_blank" rel="noopener">
                Code source <app-icon name="external" /><span class="visually-hidden"> (nouvel onglet)</span>
              </a>
            }
          </div>
          <dl class="stats">
            <div><dt>Pages de wiki</dt><dd>{{ product.wikiPages.length }}</dd></div>
            @for (queue of product.queues; track queue.type) {
              <div><dt>{{ queue.name }} à traiter</dt><dd>{{ queue.openCount }}</dd></div>
            }
          </dl>
        </div>
        <app-neon-waves />
      </section>
      <div class="container">
        <nav class="tabs-nav" aria-label="Sections du produit">
          <a [routerLink]="['/produits', product.slug]" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Présentation</a>
          <a [routerLink]="['/produits', product.slug, 'wiki']" routerLinkActive="active" ariaCurrentWhenActive="page">Wiki</a>
          <a [routerLink]="['/produits', product.slug, 'tickets']" routerLinkActive="active" ariaCurrentWhenActive="page">
            Tickets<span class="count">{{ openCount() }}<span class="visually-hidden"> à traiter</span></span>
          </a>
        </nav>
        <router-outlet />
      </div>
    } @else {
      <p class="container missing muted" role="status">Chargement du projet…</p>
    }
  `,
  styles: `
    .missing {
      display: grid;
      justify-items: start;
      gap: 1rem;
      padding-top: 3rem;

      p {
        margin: 0;
      }
    }
    .hero {
      position: relative;
      overflow: hidden;
      padding: clamp(2.5rem, 2rem + 3vw, 4.5rem) 0 9rem;
      margin-bottom: -4rem;
      background: radial-gradient(ellipse 55% 60% at 80% 30%, rgb(31 98 240 / 0.16), transparent 70%);

      .container {
        position: relative;
        z-index: 1;
      }

      .title {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        margin: 0 0 0.75rem;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.25rem, 1.6rem + 3vw, 3.75rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        overflow-wrap: anywhere;
      }

      .lead {
        max-width: 40rem;
        margin: 0 0 1.5rem;
        font-size: 1.15rem;
        color: var(--text-muted);
      }
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem 2.5rem;
      margin: 2.25rem 0 0;

      div {
        display: flex;
        flex-direction: column-reverse;
      }

      dt {
        color: var(--text-muted);
        font-size: 0.85rem;
      }

      dd {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.1;
      }
    }
    .tabs-nav {
      position: relative;
      z-index: 1;
    }
  `,
})
export class ProductLayout {
  protected readonly context = inject(ProductContext);
  private readonly title = inject(Title);

  /** Route parameter */
  readonly slug = input.required<string>();

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.context.load(slug));
    });
    effect(() => {
      const product = this.context.product();
      if (product) {
        this.title.setTitle(`${product.name} — Avenger`);
      }
    });
  }

  protected openCount(): number {
    return this.context.product()?.queues.reduce((total, queue) => total + queue.openCount, 0) ?? 0;
  }
}

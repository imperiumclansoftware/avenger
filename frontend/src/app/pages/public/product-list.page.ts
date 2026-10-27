import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { ProductCard } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';
import { ChevronMark, NeonCode, NeonWaves } from '../../shared/neon-decor';
import { ProductIcon } from '../../shared/product-icon';

/** Home page of the public area: what the site offers, then the published projects. */
@Component({
  selector: 'app-product-list-page',
  imports: [RouterLink, ChevronMark, NeonCode, NeonWaves, ProductIcon],
  template: `
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <span class="eyebrow">Open source</span>
          <h1>Des projets libres, <span class="accent">documentés</span> et à l'écoute</h1>
          <p class="lead">
            Découvrez nos logiciels libres, apprenez à les utiliser grâce à leur wiki et faites-nous part
            de vos bugs, de vos retours et de vos idées.
          </p>
          <div class="actions">
            <a class="btn primary" routerLink="/" fragment="projets">Voir les projets <span class="arrow" aria-hidden="true">→</span></a>
          </div>
          @if (products(); as products) {
            <dl class="stats">
              <div><dt>Projets</dt><dd>{{ products.length }}</dd></div>
              <div><dt>Pages de wiki</dt><dd>{{ totals().wikiPages }}</dd></div>
              <div><dt>Tickets ouverts</dt><dd>{{ totals().openTickets }}</dd></div>
            </dl>
          }
        </div>
        <app-neon-code class="hero-decor" />
      </div>
      <app-neon-waves />
    </section>

    <section class="container features" aria-label="Ce que propose chaque projet">
      @for (feature of features; track feature.title) {
        <div class="feature">
          <app-chevron-mark />
          <div>
            <h2>{{ feature.title }}</h2>
            <p class="muted">{{ feature.text }}</p>
          </div>
        </div>
      }
    </section>

    <section class="container projects" id="projets" aria-labelledby="projets-title">
      <div class="section-head">
        <span class="eyebrow">Nos projets</span>
        <h2 id="projets-title">Choisissez un projet</h2>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (products(); as products) {
        @if (products.length) {
          <ul class="grid">
            @for (product of products; track product.id) {
              <li class="card project">
                <app-product-icon [product]="product" [size]="56" />
                <h3><a [routerLink]="['/produits', product.slug]">{{ product.name }}</a></h3>
                @if (product.tagline) {
                  <p class="muted">{{ product.tagline }}</p>
                }
                <p class="counts">
                  {{ product.wikiPageCount }} {{ product.wikiPageCount > 1 ? 'pages' : 'page' }} de wiki ·
                  {{ product.openTicketCount }} {{ product.openTicketCount > 1 ? 'tickets ouverts' : 'ticket ouvert' }}
                </p>
                <p class="links">
                  <a [routerLink]="['/produits', product.slug, 'wiki']">Wiki</a>
                  <a [routerLink]="['/produits', product.slug, 'tickets']">Tickets</a>
                  @if (product.repositoryUrl) {
                    <a [href]="product.repositoryUrl" target="_blank" rel="noopener">Code source ↗</a>
                  }
                </p>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Aucun projet publié pour le moment.</p>
        }
      } @else {
        <p class="muted">Chargement…</p>
      }
    </section>
  `,
  styleUrl: './product-list.page.scss',
})
export class ProductListPage {
  private readonly productsService = inject(ProductsService);

  protected readonly products = signal<ProductCard[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly totals = computed(() =>
    (this.products() ?? []).reduce(
      (totals, p) => ({ wikiPages: totals.wikiPages + p.wikiPageCount, openTickets: totals.openTickets + p.openTicketCount }),
      { wikiPages: 0, openTickets: 0 },
    ),
  );

  protected readonly features = [
    { title: 'Une présentation claire', text: 'Ce que fait chaque projet, pour qui, et où trouver son code source.' },
    { title: 'Un wiki pour chaque projet', text: "Installation, guides d'utilisation et réponses aux questions courantes." },
    { title: "À l'écoute des utilisateurs", text: 'Signalez un bug, donnez votre avis ou proposez une fonctionnalité, sans créer de compte.' },
  ];

  constructor() {
    this.productsService.list().then(
      (products) => this.products.set(products),
      (e: unknown) => this.error.set(apiErrorMessage(e)),
    );
  }
}

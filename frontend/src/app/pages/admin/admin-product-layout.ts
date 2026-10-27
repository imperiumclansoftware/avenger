import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { Icon } from '../../shared/icon';
import { ProductIcon } from '../../shared/product-icon';
import { ProductExportDialog } from './product-export-dialog';
import { AdminProductContext } from './admin-product-context';

@Component({
  selector: 'app-admin-product-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon, ProductIcon, ProductExportDialog],
  providers: [AdminProductContext],
  template: `
    <p class="back"><a routerLink="/admin"><app-icon name="arrow-left" /> Produits</a></p>
    @if (context.error(); as error) {
      <p class="state error" role="alert">{{ error }}</p>
    } @else if (context.product(); as product) {
      <header class="head">
        <app-product-icon [product]="product" [size]="44" />
        <h1>{{ product.name }}</h1>
        <span class="badge" [attr.data-status]="product.published ? 'resolved' : null">
          {{ product.published ? 'Publié' : 'Brouillon' }}
        </span>
        <div class="actions">
          @if (product.published) {
            <a class="btn small" [routerLink]="['/produits', product.slug]" target="_blank">
              Voir la page publique <app-icon name="external" /><span class="visually-hidden"> (nouvel onglet)</span>
            </a>
          }
          <button class="btn small" type="button" (click)="exportDialog.open()">Exporter</button>
          <button class="btn small danger" type="button" [disabled]="deleting()" (click)="remove()">
            {{ deleting() ? 'Suppression…' : 'Supprimer' }}
          </button>
        </div>
      </header>
      @if (deleteError()) {
        <p class="error" role="alert">{{ deleteError() }}</p>
      }
      <nav class="tabs-nav" aria-label="Sections du produit">
        <a [routerLink]="base()" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Page d'accueil</a>
        <a [routerLink]="[base(), 'wiki']" routerLinkActive="active" ariaCurrentWhenActive="page">
          Wiki<span class="count">{{ product.wikiPages.length }}<span class="visually-hidden"> pages</span></span>
        </a>
        <a [routerLink]="[base(), 'tickets']" routerLinkActive="active" ariaCurrentWhenActive="page">
          Tickets<span class="count">{{ openCount() }}<span class="visually-hidden"> à traiter</span></span>
        </a>
        <a [routerLink]="[base(), 'integration']" routerLinkActive="active" ariaCurrentWhenActive="page">Intégration</a>
      </nav>
      <router-outlet />
      <app-product-export-dialog #exportDialog [product]="product" />
    } @else {
      <p class="state muted" role="status">Chargement du produit…</p>
    }
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;

      h1 {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .actions {
        margin-left: auto;
      }
    }
    .tabs-nav {
      margin-top: 1.5rem;
    }
  `,
})
export class AdminProductLayout {
  protected readonly context = inject(AdminProductContext);
  private readonly adminProducts = inject(AdminProductsService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  /** Route parameter */
  readonly id = input.required<string>();

  protected readonly base = computed(() => `/admin/produits/${this.id()}`);
  protected readonly openCount = computed(
    () => this.context.product()?.queues.reduce((total, queue) => total + queue.openCount, 0) ?? 0,
  );
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => void this.context.load(id));
    });
    effect(() => {
      const product = this.context.product();
      if (product) {
        this.title.setTitle(`${product.name} — Administration`);
      }
    });
  }

  protected async remove(): Promise<void> {
    const product = this.context.product();
    if (!product || !confirm(`Supprimer « ${product.name} », son wiki et tous ses tickets ? C'est définitif.`)) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.adminProducts.remove(product.id);
      await this.router.navigate(['/admin']);
    } catch (e) {
      this.deleteError.set(apiErrorMessage(e));
      this.deleting.set(false);
    }
  }
}

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { ProductIcon } from '../../shared/product-icon';
import { ProductExportDialog } from './product-export-dialog';
import { AdminProductContext } from './admin-product-context';

@Component({
  selector: 'app-admin-product-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProductIcon, ProductExportDialog],
  providers: [AdminProductContext],
  template: `
    <p><a routerLink="/admin">← Produits</a></p>
    @if (context.error(); as error) {
      <p class="error">{{ error }}</p>
    } @else if (context.product(); as product) {
      <header class="head">
        <app-product-icon [product]="product" [size]="44" />
        <h1>{{ product.name }}</h1>
        <span class="badge" [attr.data-status]="product.published ? 'resolved' : null">
          {{ product.published ? 'Publié' : 'Brouillon' }}
        </span>
        <div class="actions">
          @if (product.published) {
            <a class="btn small" [routerLink]="['/produits', product.slug]" target="_blank">Voir la page publique</a>
          }
          <button class="btn small" type="button" (click)="exportDialog.open()">Exporter</button>
          <button class="btn small danger" type="button" [disabled]="deleting()" (click)="remove()">Supprimer</button>
        </div>
      </header>
      @if (deleteError()) {
        <p class="error">{{ deleteError() }}</p>
      }
      <nav class="tabs-nav" aria-label="Sections du produit">
        <a [routerLink]="base()" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Page d'accueil</a>
        <a [routerLink]="[base(), 'wiki']" routerLinkActive="active">Wiki<span class="count">{{ product.wikiPages.length }}</span></a>
        <a [routerLink]="[base(), 'tickets']" routerLinkActive="active">Tickets<span class="count">{{ openCount() }}</span></a>
        <a [routerLink]="[base(), 'integration']" routerLinkActive="active">Intégration</a>
      </nav>
      <router-outlet />
      <app-product-export-dialog #exportDialog [product]="product" />
    } @else {
      <p class="muted">Chargement…</p>
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

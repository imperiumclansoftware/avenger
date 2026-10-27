import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { ProductSummary } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { ProductIcon } from '../../shared/product-icon';

@Component({
  selector: 'app-admin-products-page',
  imports: [RouterLink, ProductIcon],
  template: `
    <div class="head">
      <h1>Produits</h1>
      <a class="btn primary" routerLink="/admin/produits/nouveau">Nouveau produit</a>
    </div>
    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (products(); as products) {
      @if (products.length) {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Nom</th><th>Adresse</th><th>Statut</th><th>Modifié le</th></tr>
            </thead>
            <tbody>
              @for (product of products; track product.id) {
                <tr>
                  <td>
                    <span class="name">
                      <app-product-icon [product]="product" [size]="28" />
                      <a [routerLink]="['/admin/produits', product.id]">{{ product.name }}</a>
                    </span>
                  </td>
                  <td class="muted">/produits/{{ product.slug }}</td>
                  <td>
                    <span class="badge" [attr.data-status]="product.published ? 'resolved' : null">
                      {{ product.published ? 'Publié' : 'Brouillon' }}
                    </span>
                  </td>
                  <td>{{ date(product.updatedAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card empty">
          <p>Aucun produit. Créez le premier : son wiki et ses files de tickets seront créés avec lui.</p>
          <a class="btn primary" routerLink="/admin/produits/nouveau">Nouveau produit</a>
        </div>
      }
    } @else {
      <p class="muted">Chargement…</p>
    }
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
    }
    .empty {
      text-align: center;
    }
    .name {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
    }
  `,
})
export class AdminProductsPage {
  private readonly adminProducts = inject(AdminProductsService);

  protected readonly products = signal<ProductSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.adminProducts.list().then(
      (products) => this.products.set(products),
      (e: unknown) => this.error.set(apiErrorMessage(e)),
    );
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

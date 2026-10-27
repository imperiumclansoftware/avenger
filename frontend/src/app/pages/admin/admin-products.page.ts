import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { ProductSummary } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { ProductIcon } from '../../shared/product-icon';
import { Product } from '../../core/api/models';
import { ProductImportDialog } from './product-import-dialog';

@Component({
  selector: 'app-admin-products-page',
  imports: [RouterLink, ProductIcon, ProductImportDialog],
  template: `
    <div class="head">
      <h1>Produits</h1>
      <div class="actions">
        <button class="btn" type="button" (click)="importDialog.open()">Importer un produit</button>
        <a class="btn primary" routerLink="/admin/produits/nouveau">Nouveau produit</a>
      </div>
    </div>
    <app-product-import-dialog #importDialog (imported)="imported($event)" />
    @if (error()) {
      <p class="state error" role="alert">{{ error() }}</p>
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
          <div class="actions">
            <a class="btn primary" routerLink="/admin/produits/nouveau">Nouveau produit</a>
            <button class="btn" type="button" (click)="importDialog.open()">Importer un produit</button>
          </div>
        </div>
      }
    } @else {
      <p class="state muted" role="status">Chargement des produits…</p>
    }
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;

      h1 {
        margin: 0;
      }
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 1rem;
      padding-block: 2.5rem;
      text-align: center;

      p {
        max-width: 36rem;
        margin: 0;
      }
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
  private readonly router = inject(Router);

  protected readonly products = signal<ProductSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.adminProducts.list().then(
      (products) => this.products.set(products),
      (e: unknown) => this.error.set(apiErrorMessage(e)),
    );
  }

  protected imported(product: Product): void {
    void this.router.navigate(['/admin/produits', product.id]);
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}

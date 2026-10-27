import { Injectable, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../core/api/api-error';
import { Product } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';

/** The product edited in AdminProductLayout, shared with its tabs. */
@Injectable()
export class AdminProductContext {
  private readonly adminProducts = inject(AdminProductsService);

  readonly product = signal<Product | null>(null);
  readonly error = signal<string | null>(null);

  async load(id: number): Promise<void> {
    if (this.product()?.id !== id) {
      this.product.set(null);
    }
    this.error.set(null);
    try {
      this.product.set(await this.adminProducts.get(id));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Produit introuvable.'));
    }
  }

  reload(): Promise<void> {
    const product = this.product();
    return product ? this.load(product.id) : Promise.resolve();
  }
}

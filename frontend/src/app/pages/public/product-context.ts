import { Injectable, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../core/api/api-error';
import { Product } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';

/** The product shown by ProductLayout, shared with its tabs. */
@Injectable()
export class ProductContext {
  private readonly productsService = inject(ProductsService);

  readonly product = signal<Product | null>(null);
  readonly error = signal<string | null>(null);

  async load(slug: string): Promise<void> {
    if (this.product()?.slug !== slug) {
      this.product.set(null);
    }
    this.error.set(null);
    try {
      this.product.set(await this.productsService.get(slug));
    } catch (e) {
      this.product.set(null);
      this.error.set(apiErrorMessage(e, 'Produit introuvable.'));
    }
  }
}

import { Component, inject } from '@angular/core';
import { Markdown } from '../../shared/markdown';
import { ProductContext } from './product-context';

@Component({
  selector: 'app-product-home-page',
  imports: [Markdown],
  template: `
    @if (context.product(); as product) {
      @if (product.homepage) {
        <article class="card"><app-markdown [content]="product.homepage" /></article>
      } @else {
        <p class="state muted">La présentation de ce projet n'a pas encore été rédigée.</p>
      }
    }
  `,
})
export class ProductHomePage {
  protected readonly context = inject(ProductContext);
}

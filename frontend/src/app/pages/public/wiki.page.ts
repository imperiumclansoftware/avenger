import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { WikiPage } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';
import { Markdown } from '../../shared/markdown';
import { ProductContext } from './product-context';

@Component({
  selector: 'app-wiki-page',
  imports: [Markdown, RouterLink, RouterLinkActive],
  template: `
    @if (context.product(); as product) {
      <div class="wiki">
        <nav aria-label="Pages du wiki">
          <ul>
            @for (p of product.wikiPages; track p.id) {
              <li>
                <a [routerLink]="['/produits', product.slug, 'wiki', p.slug]" routerLinkActive="active">{{ p.title }}</a>
              </li>
            }
          </ul>
        </nav>
        <article class="card">
          @if (error()) {
            <p class="error">{{ error() }}</p>
          } @else if (wikiPage(); as wikiPage) {
            <app-markdown [content]="wikiPage.content" />
            <p class="muted updated">Mis à jour le {{ date(wikiPage.updatedAt) }}</p>
          } @else {
            <p class="muted">Chargement…</p>
          }
        </article>
      </div>
    }
  `,
  styles: `
    .wiki {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: 14rem minmax(0, 1fr);
      align-items: start;

      @media (width < 48rem) {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li a {
      display: block;
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius);
      color: var(--text);
      text-decoration: none;

      &.active {
        background: var(--surface-alt);
        font-weight: 600;
      }
    }
    .updated {
      margin-bottom: 0;
      font-size: 0.85rem;
    }
  `,
})
export class WikiPageComponent {
  protected readonly context = inject(ProductContext);
  private readonly productsService = inject(ProductsService);

  /** Route parameters */
  readonly slug = input.required<string>();
  readonly page = input.required<string>();

  protected readonly wikiPage = signal<WikiPage | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const slug = this.slug();
      const page = this.page();
      untracked(() => void this.load(slug, page));
    });
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' });
  }

  private async load(slug: string, page: string): Promise<void> {
    this.wikiPage.set(null);
    this.error.set(null);
    try {
      this.wikiPage.set(await this.productsService.wikiPage(slug, page));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Page introuvable.'));
    }
  }
}

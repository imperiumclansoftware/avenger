import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { Ticket } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';
import { Markdown } from '../../shared/markdown';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-ticket-detail-page',
  imports: [Markdown, RouterLink, StatusBadge],
  template: `
    <p><a [routerLink]="['/produits', slug(), 'tickets']">← Tous les tickets</a></p>
    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (ticket(); as ticket) {
      <article class="card">
        <h2>{{ ticket.title }} <span class="muted">#{{ ticket.number }}</span></h2>
        <p class="meta">
          <app-status-badge [status]="ticket.status" />
          <span class="muted">{{ ticket.queueName }} · ouvert par {{ ticket.authorName }} le {{ date(ticket.createdAt) }}</span>
        </p>
        <app-markdown [content]="ticket.description" />
      </article>
    } @else {
      <p class="muted">Chargement…</p>
    }
  `,
  styles: `
    h2 {
      margin-top: 0;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.9rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
  `,
})
export class TicketDetailPage {
  private readonly productsService = inject(ProductsService);

  /** Route parameters */
  readonly slug = input.required<string>();
  readonly number = input.required<string>();

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const slug = this.slug();
      const number = Number(this.number());
      untracked(() => void this.load(slug, number));
    });
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' });
  }

  private async load(slug: string, number: number): Promise<void> {
    this.ticket.set(null);
    this.error.set(null);
    try {
      this.ticket.set(await this.productsService.ticket(slug, number));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Ticket introuvable.'));
    }
  }
}

import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { Ticket, TicketStatus, TicketType } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';
import { StatusBadge } from '../../shared/status-badge';
import { TICKET_STATUSES } from '../../shared/tickets';
import { ProductContext } from './product-context';

@Component({
  selector: 'app-ticket-list-page',
  imports: [RouterLink, StatusBadge],
  template: `
    @if (context.product(); as product) {
      <div class="toolbar">
        <nav class="chips" aria-label="Files de tickets">
          <a [routerLink]="[]" [queryParams]="{ type: null }" queryParamsHandling="merge" [class.active]="!type()">Tous</a>
          @for (queue of product.queues; track queue.type) {
            <a [routerLink]="[]" [queryParams]="{ type: queue.type }" queryParamsHandling="merge" [class.active]="type() === queue.type">
              {{ queue.name }}<span class="count">{{ queue.openCount }}</span>
            </a>
          }
        </nav>
        <select aria-label="Statut" (change)="filterStatus($event)">
          <option value="">Tous les statuts</option>
          @for (s of statuses; track s.value) {
            <option [value]="s.value" [selected]="s.value === statut()">{{ s.label }}</option>
          }
        </select>
        <a class="btn primary" [routerLink]="['/produits', product.slug, 'tickets', 'nouveau']" [queryParams]="{ type: type() }">
          Ouvrir un ticket
        </a>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (tickets(); as tickets) {
        @if (tickets.length) {
          <ul class="tickets">
            @for (ticket of tickets; track ticket.number) {
              <li class="card">
                <div class="title">
                  <a [routerLink]="['/produits', product.slug, 'tickets', ticket.number]">{{ ticket.title }}</a>
                  <app-status-badge [status]="ticket.status" />
                </div>
                <p class="muted meta">
                  #{{ ticket.number }} · {{ ticket.queueName }} · ouvert par {{ ticket.authorName }} le {{ date(ticket.createdAt) }}
                </p>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Aucun ticket.</p>
        }
      } @else {
        <p class="muted">Chargement…</p>
      }
    }
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;

      select {
        width: auto;
      }

      .btn {
        margin-left: auto;
      }
    }
    .tickets {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .title {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      font-weight: 600;
    }
    .meta {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
    }
  `,
})
export class TicketListPage {
  protected readonly context = inject(ProductContext);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  /** Route parameter */
  readonly slug = input.required<string>();
  /** Query parameters */
  readonly type = input<TicketType>();
  readonly statut = input<TicketStatus>();

  protected readonly statuses = TICKET_STATUSES;
  protected readonly tickets = signal<Ticket[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const slug = this.slug();
      const filter = { type: this.type(), status: this.statut() };
      untracked(() => void this.load(slug, filter));
    });
  }

  protected filterStatus(event: Event): void {
    const statut = (event.target as HTMLSelectElement).value || null;
    void this.router.navigate([], { queryParams: { statut }, queryParamsHandling: 'merge' });
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  private async load(slug: string, filter: { type?: TicketType; status?: TicketStatus }): Promise<void> {
    this.error.set(null);
    try {
      this.tickets.set(await this.productsService.tickets(slug, filter));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }
}

import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { AdminTicket, TicketStatus, TicketType } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { Markdown } from '../../shared/markdown';
import { TICKET_STATUSES, TICKET_TYPES } from '../../shared/tickets';
import { AdminProductContext } from './admin-product-context';

/** Handling the tickets of a product: status, queue, contact of the author. */
@Component({
  selector: 'app-admin-tickets-page',
  imports: [RouterLink, Markdown],
  template: `
    @if (context.product(); as product) {
      <div class="toolbar">
        <nav class="chips" aria-label="Files de tickets">
          <a [routerLink]="[]" [queryParams]="{ type: null }" queryParamsHandling="merge" [class.active]="!type()">Toutes les files</a>
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
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (tickets(); as tickets) {
        @if (tickets.length) {
          <ul class="tickets">
            @for (ticket of tickets; track ticket.id) {
              <li class="card">
                <details>
                  <summary>
                    <span class="title">#{{ ticket.number }} {{ ticket.title }}</span>
                    <span class="muted meta">
                      {{ ticket.authorName }} &lt;<a [href]="'mailto:' + ticket.authorEmail">{{ ticket.authorEmail }}</a>&gt; · {{ date(ticket.createdAt) }}
                    </span>
                  </summary>
                  <div class="description"><app-markdown [content]="ticket.description" /></div>
                </details>
                <div class="controls">
                  <label>
                    File
                    <select (change)="change(ticket, { type: value($event) })">
                      @for (t of types; track t.value) {
                        <option [value]="t.value" [selected]="t.value === ticket.type">{{ t.label }}</option>
                      }
                    </select>
                  </label>
                  <label>
                    Statut
                    <select (change)="change(ticket, { status: value($event) })">
                      @for (s of statuses; track s.value) {
                        <option [value]="s.value" [selected]="s.value === ticket.status">{{ s.label }}</option>
                      }
                    </select>
                  </label>
                  <button class="btn small danger" type="button" (click)="remove(ticket)">Supprimer</button>
                </div>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Aucun ticket.</p>
        }
      } @else if (!error()) {
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
    }
    .tickets {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    li {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: space-between;
    }
    details {
      flex: 1 1 24rem;
      min-width: 0;
    }
    summary {
      cursor: pointer;
    }
    .title {
      font-weight: 600;
    }
    .meta {
      display: block;
      font-size: 0.85rem;
    }
    .description {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: flex-end;

      label {
        display: grid;
        gap: 0.15rem;
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      select {
        width: auto;
        padding: 0.25rem 0.4rem;
      }
    }
  `,
})
export class AdminTicketsPage {
  protected readonly context = inject(AdminProductContext);
  private readonly adminProducts = inject(AdminProductsService);
  private readonly router = inject(Router);

  /** Route parameter */
  readonly id = input.required<string>();
  /** Query parameters */
  readonly type = input<TicketType>();
  readonly statut = input<TicketStatus>();

  protected readonly types = TICKET_TYPES;
  protected readonly statuses = TICKET_STATUSES;
  protected readonly tickets = signal<AdminTicket[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const productId = Number(this.id());
      const filter = { type: this.type(), status: this.statut() };
      untracked(() => void this.load(productId, filter));
    });
  }

  protected filterStatus(event: Event): void {
    const statut = (event.target as HTMLSelectElement).value || null;
    void this.router.navigate([], { queryParams: { statut }, queryParamsHandling: 'merge' });
  }

  protected value<T extends string>(event: Event): T {
    return (event.target as HTMLSelectElement).value as T;
  }

  protected async change(ticket: AdminTicket, change: { status?: TicketStatus; type?: TicketType }): Promise<void> {
    this.error.set(null);
    try {
      const updated = await this.adminProducts.updateTicket(Number(this.id()), ticket.number, {
        status: change.status ?? ticket.status,
        type: change.type ?? ticket.type,
      });
      this.tickets.update((tickets) => tickets?.map((t) => (t.id === updated.id ? updated : t)) ?? null);
      // The counts of open tickets per queue changed
      void this.context.reload();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }

  protected async remove(ticket: AdminTicket): Promise<void> {
    if (!confirm(`Supprimer le ticket #${ticket.number} « ${ticket.title} » ?`)) {
      return;
    }
    try {
      await this.adminProducts.removeTicket(Number(this.id()), ticket.number);
      this.tickets.update((tickets) => tickets?.filter((t) => t.id !== ticket.id) ?? null);
      void this.context.reload();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  private async load(productId: number, filter: { type?: TicketType; status?: TicketStatus }): Promise<void> {
    this.error.set(null);
    try {
      this.tickets.set(await this.adminProducts.tickets(productId, filter));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }
}

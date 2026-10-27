import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Ticket, TicketType } from '../../core/api/models';
import { TicketForm } from '../../shared/ticket-form';
import { ProductContext } from './product-context';

@Component({
  selector: 'app-ticket-new-page',
  imports: [RouterLink, TicketForm],
  template: `
    <h2>Ouvrir un ticket</h2>
    <app-ticket-form [slug]="slug()" [prefill]="prefill()" (created)="created($event)">
      <a class="btn" [routerLink]="['/produits', slug(), 'tickets']">Annuler</a>
    </app-ticket-form>
  `,
})
export class TicketNewPage {
  private readonly context = inject(ProductContext);
  private readonly router = inject(Router);

  /** Route parameter */
  readonly slug = input.required<string>();
  /** Query parameter: the queue the visitor came from */
  readonly type = input<TicketType>();

  protected readonly prefill = computed(() => ({ type: this.type() }));

  protected async created(ticket: Ticket): Promise<void> {
    // The counts of open tickets changed
    void this.context.load(this.slug());
    await this.router.navigate(['/produits', this.slug(), 'tickets', ticket.number]);
  }
}

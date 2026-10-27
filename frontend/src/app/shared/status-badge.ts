import { Component, computed, input } from '@angular/core';
import { TicketStatus } from '../core/api/models';
import { statusLabel } from './tickets';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [attr.data-status]="status()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<TicketStatus>();

  protected readonly label = computed(() => statusLabel(this.status()));
}

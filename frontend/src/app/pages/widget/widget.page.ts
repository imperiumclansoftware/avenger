import { Component, DestroyRef, ElementRef, effect, inject, input, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { apiErrorMessage } from '../../core/api/api-error';
import { Product, Ticket, TicketType } from '../../core/api/models';
import { ProductsService } from '../../core/products/products.service';
import { TicketForm, TicketPrefill } from '../../shared/ticket-form';
import { HOST_SOURCE, HostPrefillMessage, WIDGET_SOURCE, WidgetMessage, httpOrigin } from './widget-protocol';

/**
 * The ticket form shown in the widget that other apps embed (public/widget.js), inside an iframe.
 */
@Component({
  selector: 'app-widget-page',
  imports: [TicketForm],
  template: `
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (product(); as product) {
      @if (sent(); as ticket) {
        <div class="sent" role="status">
          <h1>Merci, votre ticket a été envoyé</h1>
          <p>
            Il porte le numéro <strong>#{{ ticket.number }}</strong>. L'équipe de {{ product.name }} vous répondra
            par e-mail si besoin.
          </p>
          <div class="actions">
            <a class="btn" [href]="ticketUrl(ticket)" target="_blank" rel="noopener">Suivre le ticket ↗</a>
            <button class="btn" type="button" (click)="another()">Ouvrir un autre ticket</button>
            <button class="btn primary" type="button" (click)="post({ source: widget, type: 'close' })">Fermer</button>
          </div>
        </div>
      } @else {
        <h1>Signaler un problème <span class="muted">· {{ product.name }}</span></h1>
        <app-ticket-form [slug]="slug()" [prefill]="prefill()" [sourceUrl]="pageUrl()" [rows]="6" (created)="created($event)" />
      }
    } @else {
      <p class="muted">Chargement…</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 1.25rem 1.5rem 1.5rem;
    }
    h1 {
      margin: 0 0 1.25rem;
      font-size: 1.4rem;
    }
    .sent {
      padding: 1rem 0;
    }
  `,
})
export class WidgetPage {
  private readonly productsService = inject(ProductsService);
  private readonly document = inject(DOCUMENT);

  /** Route parameter */
  readonly slug = input.required<string>();
  /** Query parameters set by widget.js: default queue, and origin of the embedding page */
  readonly type = input<TicketType>();
  readonly origin = input<string>();

  protected readonly widget = WIDGET_SOURCE;
  protected readonly product = signal<Product | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly prefill = signal<TicketPrefill>({});
  protected readonly pageUrl = signal<string | null>(null);
  protected readonly sent = signal<Ticket | null>(null);

  constructor() {
    const window = this.document.defaultView!;
    const onMessage = (event: MessageEvent) => this.onHostMessage(event);
    window.addEventListener('message', onMessage);
    // Escape pressed while the focus is in the iframe: the host's dialog does not see it
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.post({ source: WIDGET_SOURCE, type: 'close' });
      }
    };
    window.addEventListener('keydown', onKey);
    // The host sizes its iframe to the content. Measure this element, not the document:
    // its scrollHeight never goes below the iframe's height, so the frame could never shrink.
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = new ResizeObserver(() =>
      this.post({ source: WIDGET_SOURCE, type: 'resize', height: Math.ceil(element.getBoundingClientRect().height) }),
    );
    observer.observe(element);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
      observer.disconnect();
    });

    effect(() => {
      const slug = this.slug();
      untracked(() => void this.load(slug));
    });
    effect(() => {
      const type = this.type();
      untracked(() => this.prefill.update((prefill) => ({ ...prefill, type: prefill.type ?? type })));
    });
    // Inputs are only set after the constructor: announce the page once the host's origin is known
    effect(() => {
      if (this.origin()) {
        untracked(() => this.post({ source: WIDGET_SOURCE, type: 'ready' }));
      }
    });
  }

  protected created(ticket: Ticket): void {
    this.sent.set(ticket);
    this.post({
      source: WIDGET_SOURCE,
      type: 'created',
      ticket: { number: ticket.number, type: ticket.type, title: ticket.title, url: this.ticketUrl(ticket) },
    });
  }

  /** A new form, prefilled again with what the host sent */
  protected another(): void {
    this.sent.set(null);
  }

  protected ticketUrl(ticket: Ticket): string {
    return new URL(`produits/${this.slug()}/tickets/${ticket.number}`, this.document.baseURI).href;
  }

  /** To the embedding page only: never with "*", the ticket title is the visitor's text. */
  protected post(message: WidgetMessage): void {
    const window = this.document.defaultView!;
    const target = httpOrigin(this.origin());
    if (target && window.parent !== window) {
      window.parent.postMessage(message, target);
    }
  }

  private onHostMessage(event: MessageEvent): void {
    const window = this.document.defaultView!;
    const expected = httpOrigin(this.origin());
    const data = event.data as Partial<HostPrefillMessage> | null;
    if (event.source !== window.parent || !expected || httpOrigin(event.origin) !== expected) {
      return;
    }
    if (data?.source !== HOST_SOURCE || data.type !== 'prefill') {
      return;
    }
    const prefill = data.prefill ?? {};
    this.prefill.set({
      type: prefill.type ?? this.type(),
      name: typeof prefill.name === 'string' ? prefill.name : null,
      email: typeof prefill.email === 'string' ? prefill.email : null,
    });
    // Only a page of the embedding app, never another site
    this.pageUrl.set(typeof data.pageUrl === 'string' && httpOrigin(data.pageUrl) === expected ? data.pageUrl.slice(0, 300) : null);
  }

  private async load(slug: string): Promise<void> {
    try {
      this.product.set(await this.productsService.get(slug));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Ce produit est introuvable ou n\'est pas publié.'));
    }
  }
}

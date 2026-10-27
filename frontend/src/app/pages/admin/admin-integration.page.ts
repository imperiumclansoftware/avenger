import { Component, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CodeBlock } from '../../shared/code-block';
import { AdminProductContext } from './admin-product-context';

/**
 * How to embed the ticket widget (public/widget.js) in the product's own app,
 * with the code ready to copy for this product and this Avenger.
 */
@Component({
  selector: 'app-admin-integration-page',
  imports: [CodeBlock],
  templateUrl: './admin-integration.page.html',
  styleUrl: './admin-integration.page.scss',
})
export class AdminIntegrationPage {
  protected readonly context = inject(AdminProductContext);
  private readonly baseUri = inject(DOCUMENT).baseURI;

  protected readonly scriptUrl = new URL('widget.js', this.baseUri).href;
  protected readonly avengerOrigin = new URL(this.baseUri).origin;
  protected readonly slug = computed(() => this.context.product()?.slug ?? '');
  protected readonly demoUrl = computed(() => new URL(`widget-demo.html?product=${this.slug()}`, this.baseUri).href);

  protected readonly basic = computed(
    () => `<script src="${this.scriptUrl}" data-product="${this.slug()}" defer></script>`,
  );

  protected readonly prefill = computed(
    () => `<script src="${this.scriptUrl}" data-product="${this.slug()}" defer></script>
<script>
  // Une fois l'utilisateur connu (après la connexion par exemple)
  window.addEventListener('load', () => {
    window.AvengerTickets?.set({ name: utilisateur.nom, email: utilisateur.email });
  });
</script>`,
  );

  protected readonly ownButton = computed(
    () => `<script src="${this.scriptUrl}" data-product="${this.slug()}" data-button="false" defer></script>

<button type="button" onclick="AvengerTickets.open({ type: 'bug' })">Signaler un problème</button>`,
  );

  protected readonly angular = computed(
    () => `import { Injectable } from '@angular/core';

declare global {
  interface Window {
    AvengerTickets?: {
      open(options?: { type?: 'bug' | 'feedback' | 'feature'; name?: string; email?: string }): void;
      close(): void;
      set(options: { type?: string; name?: string; email?: string }): void;
    };
  }
}

/** Ouvre le formulaire de ticket d'Avenger ; le script n'est chargé qu'au premier appel. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private loading?: Promise<void>;

  async open(user?: { name: string; email: string | null }): Promise<void> {
    await this.load();
    window.AvengerTickets?.open({ name: user?.name, email: user?.email ?? undefined });
  }

  private load(): Promise<void> {
    return (this.loading ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '${this.scriptUrl}';
      script.dataset['product'] = '${this.slug()}';
      script.dataset['button'] = 'false';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Avenger injoignable'));
      document.head.append(script);
    }));
  }
}`,
  );

  protected readonly event = `window.addEventListener('avenger:ticket-created', (event) => {
  // event.detail : { number, type, title, url }
  console.log('Ticket ouvert', event.detail.number, event.detail.url);
});`;

  protected readonly csp = computed(
    () => `Content-Security-Policy: script-src 'self' ${this.avengerOrigin}; frame-src ${this.avengerOrigin}`,
  );
}

import { Component, inject, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, apiViolations } from '../../core/api/api-error';
import { Product } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { Modal } from '../../shared/modal';

/** What the chosen file holds, shown before importing it */
interface ArchiveSummary {
  name: string;
  slug: string;
  wikiPages: number;
  tickets: number;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Same limit as the server (php.ini post_max_size of the image) */
const MAX_SIZE = 32 * 1024 * 1024;

/** Creates a product from the export of another Avenger, as a draft. */
@Component({
  selector: 'app-product-import-dialog',
  imports: [Modal],
  template: `
    <dialog appModal aria-labelledby="import-title">
      <h2 id="import-title">Importer un produit</h2>
      <p class="muted">
        Choisissez le fichier exporté depuis un autre Avenger (<em>Exporter</em>, sur la page du produit). Le produit
        est créé en <strong>brouillon</strong> : vérifiez-le, puis publiez-le.
      </p>
      <div class="field">
        <label for="archive">Fichier d'export (.json)</label>
        <input id="archive" type="file" accept=".json,application/json" [disabled]="busy()" (change)="choose($event)" aria-describedby="archive-error" />
        @if (fileError(); as error) {
          <span class="field-error" id="archive-error">{{ error }}</span>
        }
      </div>

      @if (summary(); as summary) {
        <dl class="summary">
          <div><dt>Produit</dt><dd>{{ summary.name }}</dd></div>
          <div><dt>Pages de wiki</dt><dd>{{ summary.wikiPages }}</dd></div>
          <div><dt>Tickets</dt><dd>{{ summary.tickets }}</dd></div>
        </dl>
        <div class="field">
          <label for="import-slug">Adresse</label>
          <input id="import-slug" type="text" [value]="slug()" (input)="slug.set($any($event.target).value)" maxlength="120" aria-describedby="import-slug-hint import-slug-error" />
          <span class="hint" id="import-slug-hint">/produits/{{ slug() || '…' }} — à changer si elle est déjà prise ici.</span>
          @if (slugError(); as error) {
            <span class="field-error" id="import-slug-error">{{ error }}</span>
          }
        </div>
      }

      @if (errors().length) {
        <div class="error" role="alert">
          <p>Ce fichier ne peut pas être importé :</p>
          <ul>
            @for (error of errors(); track $index) {
              <li>{{ error }}</li>
            }
          </ul>
        </div>
      }
      <div class="actions">
        <button class="btn primary" type="button" [disabled]="!summary() || busy()" (click)="import()">{{ busy() ? 'Import…' : 'Importer' }}</button>
        <button class="btn" type="button" (click)="modal().close()">Annuler</button>
      </div>
    </dialog>
  `,
  styles: `
    .field {
      margin-top: 1rem;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin: 1.25rem 0 0;

      div {
        display: flex;
        flex-direction: column-reverse;
      }

      dt {
        color: var(--text-muted);
        font-size: 0.85rem;
      }

      dd {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.2rem;
        font-weight: 600;
      }
    }
    .error {
      margin-top: 1rem;

      p {
        margin: 0;
      }

      ul {
        margin: 0.25rem 0 0;
        padding-left: 1.25rem;
        overflow-wrap: anywhere;
      }
    }
    .actions {
      margin-top: 1.25rem;
    }
  `,
})
export class ProductImportDialog {
  private readonly adminProducts = inject(AdminProductsService);
  protected readonly modal = viewChild.required(Modal);

  readonly imported = output<Product>();

  private archive: unknown = null;
  protected readonly summary = signal<ArchiveSummary | null>(null);
  protected readonly slug = signal('');
  protected readonly busy = signal(false);
  protected readonly fileError = signal<string | null>(null);
  protected readonly slugError = signal<string | null>(null);
  protected readonly errors = signal<string[]>([]);

  open(): void {
    this.archive = null;
    this.summary.set(null);
    this.fileError.set(null);
    this.slugError.set(null);
    this.errors.set([]);
    this.modal().open();
  }

  protected async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.archive = null;
    this.summary.set(null);
    this.fileError.set(null);
    this.slugError.set(null);
    this.errors.set([]);
    if (!file) {
      return;
    }
    if (file.size > MAX_SIZE) {
      this.fileError.set('Ce fichier dépasse 32 Mo.');
      return;
    }
    try {
      const archive = JSON.parse(await file.text());
      const product = archive?.product;
      if (archive?.format !== 'avenger-product' || typeof product?.name !== 'string') {
        this.fileError.set("Ce fichier n'est pas un export de produit Avenger.");
        return;
      }
      this.archive = archive;
      this.slug.set(typeof product.slug === 'string' ? product.slug : '');
      this.summary.set({
        name: product.name,
        slug: this.slug(),
        wikiPages: Array.isArray(archive.wiki) ? archive.wiki.length : 0,
        tickets: Array.isArray(archive.tickets) ? archive.tickets.length : 0,
      });
    } catch {
      this.fileError.set("Ce fichier n'est pas un JSON lisible.");
    }
  }

  protected async import(): Promise<void> {
    const summary = this.summary();
    if (!summary || !this.archive) {
      return;
    }
    const slug = this.slug().trim();
    if (!SLUG_PATTERN.test(slug)) {
      this.slugError.set("L'adresse ne peut contenir que des minuscules sans accents, des chiffres et des tirets (ex. : mon-projet).");
      return;
    }
    this.busy.set(true);
    this.slugError.set(null);
    this.errors.set([]);
    try {
      const product = await this.adminProducts.importProduct(this.archive, slug === summary.slug ? null : slug);
      this.modal().close();
      this.imported.emit(product);
    } catch (e) {
      const violations = apiViolations(e);
      const { slug: slugViolation, ...others } = violations;
      if (slugViolation) {
        this.slugError.set(slugViolation);
        // A free address to try
        this.slug.set(`${slug}-2`);
      }
      const messages = Object.entries(others).map(([path, message]) => (path ? `${path} : ${message}` : message));
      if (!slugViolation && !messages.length) {
        messages.push(e instanceof HttpErrorResponse && e.status === 413 ? 'Ce fichier est trop volumineux pour le serveur.' : apiErrorMessage(e));
      }
      this.errors.set(messages);
    } finally {
      this.busy.set(false);
    }
  }
}

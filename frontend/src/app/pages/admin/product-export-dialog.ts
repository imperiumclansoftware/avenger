import { Component, input, inject, signal, viewChild } from '@angular/core';
import { apiErrorMessage } from '../../core/api/api-error';
import { Product } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

/** Downloads the product in one file, to import it into another Avenger. */
@Component({
  selector: 'app-product-export-dialog',
  imports: [Icon, Modal],
  template: `
    <dialog appModal aria-labelledby="export-title">
      <h2 id="export-title">Exporter « {{ product().name }} »</h2>
      <p class="muted">
        Un fichier JSON avec la page d'accueil, l'icône et les {{ product().wikiPages.length }} pages du wiki,
        à importer dans un autre Avenger (<em>Produits › Importer un produit</em>).
      </p>
      <label class="checkbox">
        <input type="checkbox" [checked]="withTickets()" (change)="withTickets.set($any($event.target).checked)" />
        Inclure les tickets
      </label>
      @if (withTickets()) {
        <p class="note" role="note">
          <app-icon name="alert" />
          Les tickets contiennent les noms et e-mails de leurs auteurs : conservez et transmettez ce fichier
          comme une donnée personnelle.
        </p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="actions">
        <button class="btn primary" type="button" autofocus [disabled]="busy()" (click)="download()">
          {{ busy() ? 'Préparation…' : 'Télécharger' }}
        </button>
        <button class="btn" type="button" (click)="modal().close()">Annuler</button>
      </div>
    </dialog>
  `,
  styles: `
    .note {
      margin-top: 1rem;
    }
    .actions {
      margin-top: 1.25rem;
    }
  `,
})
export class ProductExportDialog {
  private readonly adminProducts = inject(AdminProductsService);
  protected readonly modal = viewChild.required(Modal);

  readonly product = input.required<Product>();

  protected readonly withTickets = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  open(): void {
    this.withTickets.set(false);
    this.error.set(null);
    this.modal().open();
  }

  protected async download(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const { file, name } = await this.adminProducts.exportProduct(this.product().id, this.withTickets());
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url));
      this.modal().close();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}

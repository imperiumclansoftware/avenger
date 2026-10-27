import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { Product, ProductPayload } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { FormErrors } from '../../shared/form-errors';
import { MarkdownEditor } from '../../shared/markdown-editor';
import { ProductIcon } from '../../shared/product-icon';
import { AdminProductContext } from './admin-product-context';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_PATTERN = /^https?:\/\/[^\s.]+\.[^\s]+$/;
/** Same limits as the API (AdminProductController::uploadIcon) */
const ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const ICON_MAX_SIZE = 1024 * 1024;

/**
 * Creates a product (with its wiki and ticket queues), or edits it and its home page
 * as the first tab of AdminProductLayout.
 */
@Component({
  selector: 'app-product-form-page',
  imports: [ReactiveFormsModule, RouterLink, MarkdownEditor, ProductIcon],
  template: `
    @if (!context) {
      <p><a routerLink="/admin">← Produits</a></p>
      <h1>Nouveau produit</h1>
      <p class="muted">Un wiki (avec sa page d'accueil) et trois files de tickets — bugs, retours utilisateurs et demandes de fonctionnalités — sont créés avec le produit.</p>
    }
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="icon">Icône</label>
        <div class="icon-row">
          <app-product-icon [product]="iconProduct()" [preview]="iconPreview()" [size]="64" />
          <div class="icon-controls">
            <input id="icon" type="file" [accept]="iconTypes" [disabled]="iconSaving()" (change)="chooseIcon($event)" aria-describedby="icon-hint icon-error" />
            <span class="hint" id="icon-hint">PNG, JPEG, WebP, GIF ou SVG, 1 Mo maximum ; une image carrée de préférence.</span>
            @if (iconError(); as error) {
              <span class="field-error" id="icon-error">{{ error }}</span>
            }
            @if (context?.product()?.iconUrl) {
              <button class="btn small danger" type="button" [disabled]="iconSaving()" (click)="removeIcon()">Retirer l'icône</button>
            }
          </div>
        </div>
      </div>
      <div class="field">
        <label for="name">Nom</label>
        <input id="name" type="text" formControlName="name" maxlength="120" [attr.aria-invalid]="!!errors.of('name')" aria-describedby="name-error" />
        @if (errors.of('name'); as error) {
          <span class="field-error" id="name-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="slug">Adresse</label>
        <input id="slug" type="text" formControlName="slug" maxlength="120" placeholder="générée à partir du nom" [attr.aria-invalid]="!!errors.of('slug')" aria-describedby="slug-error" />
        @if (errors.of('slug'); as error) {
          <span class="field-error" id="slug-error">{{ error }}</span>
        }
        <span class="hint">/produits/{{ form.controls.slug.value || 'nom-du-produit' }} — minuscules, chiffres et tirets.</span>
      </div>
      <div class="field">
        <label for="tagline">Accroche</label>
        <input id="tagline" type="text" formControlName="tagline" maxlength="255" placeholder="Une phrase pour présenter le projet" [attr.aria-invalid]="!!errors.of('tagline')" aria-describedby="tagline-error" />
        @if (errors.of('tagline'); as error) {
          <span class="field-error" id="tagline-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="repositoryUrl">Dépôt du code source</label>
        <input id="repositoryUrl" type="url" formControlName="repositoryUrl" placeholder="https://github.com/…" [attr.aria-invalid]="!!errors.of('repositoryUrl')" aria-describedby="repositoryUrl-error" />
        @if (errors.of('repositoryUrl'); as error) {
          <span class="field-error" id="repositoryUrl-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="homepage">Page d'accueil</label>
        <app-markdown-editor inputId="homepage" formControlName="homepage" [rows]="18" />
        @if (errors.of('homepage'); as error) {
          <span class="field-error">{{ error }}</span>
        }
      </div>
      <label class="checkbox">
        <input type="checkbox" formControlName="published" />
        Publié (visible dans l'espace public)
      </label>

      @if (errors.general(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (saved()) {
        <p class="saved" role="status">Enregistré.</p>
      }
      <div class="actions">
        <button class="btn primary" type="submit" [disabled]="saving()">
          {{ context ? 'Enregistrer' : 'Créer le produit' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .saved {
      color: var(--success);
    }
    .icon-row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .icon-controls {
      display: grid;
      gap: 0.4rem;
      justify-items: start;
    }
    input[type='file'] {
      max-width: 100%;
      color: var(--text-muted);
    }
  `,
})
export class ProductFormPage {
  /** Present when editing: the form is a tab of the product */
  protected readonly context = inject(AdminProductContext, { optional: true });
  private readonly adminProducts = inject(AdminProductsService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly iconTypes = ICON_TYPES.join(',');
  protected readonly iconSaving = signal(false);
  protected readonly iconError = signal<string | null>(null);
  /** Local preview of the chosen file */
  protected readonly iconPreview = signal<string | null>(null);
  /** New product: the icon is sent once the product exists */
  private pendingIcon: File | null = null;
  private filledId?: number;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.pattern(SLUG_PATTERN), Validators.maxLength(120)]],
    tagline: ['', Validators.maxLength(255)],
    repositoryUrl: ['', [Validators.pattern(URL_PATTERN), Validators.maxLength(255)]],
    homepage: ['# Présentation\n\n'],
    published: [false],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form, {
    name: { required: 'Le nom est obligatoire.' },
    slug: { pattern: "L'adresse ne peut contenir que des minuscules sans accents, des chiffres et des tirets (ex. : mon-projet)." },
    repositoryUrl: { pattern: "L'adresse du dépôt doit commencer par http:// ou https:// (ex. : https://github.com/moi/projet)." },
  });

  private readonly name = signal('');
  /** What ProductIcon shows: the saved icon, else the initial of the name being typed */
  protected readonly iconProduct = computed(() => ({
    name: this.name() || '?',
    iconUrl: this.context?.product()?.iconUrl ?? null,
  }));

  constructor() {
    effect(() => {
      const product = this.context?.product();
      // Filled once per product: a new icon must not wipe what is being typed
      if (product && product.id !== this.filledId) {
        this.filledId = product.id;
        untracked(() => this.fill(product));
      }
    });
    this.form.valueChanges.subscribe(() => this.saved.set(false));
    this.form.controls.name.valueChanges.subscribe((name) => this.name.set(name));
    inject(DestroyRef).onDestroy(() => this.setPreview(null));
  }

  protected async chooseIcon(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.iconError.set(null);
    if (!file) {
      return;
    }
    if (!ICON_TYPES.includes(file.type)) {
      this.iconError.set('Formats acceptés : PNG, JPEG, WebP, GIF ou SVG.');
      return;
    }
    if (file.size > ICON_MAX_SIZE) {
      this.iconError.set("L'icône ne doit pas dépasser 1 Mo.");
      return;
    }

    const product = this.context?.product();
    if (!product) {
      this.pendingIcon = file;
      this.setPreview(URL.createObjectURL(file));
      return;
    }
    await this.saveIcon(product.id, file);
  }

  protected async removeIcon(): Promise<void> {
    const product = this.context?.product();
    if (!product) {
      return;
    }
    this.iconSaving.set(true);
    this.iconError.set(null);
    try {
      this.context!.product.set(await this.adminProducts.removeIcon(product.id));
    } catch (e) {
      this.iconError.set(apiErrorMessage(e));
    } finally {
      this.iconSaving.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (!this.errors.validate()) {
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload: ProductPayload = {
      ...value,
      slug: value.slug || null,
      repositoryUrl: value.repositoryUrl || null,
    };
    try {
      const product = this.context?.product();
      if (product) {
        this.context!.product.set(await this.adminProducts.update(product.id, payload));
        this.saved.set(true);
      } else {
        const created = await this.adminProducts.create(payload);
        if (this.pendingIcon) {
          // The product exists even if its icon is refused: it can be chosen again there
          await this.saveIcon(created.id, this.pendingIcon);
        }
        await this.router.navigate(['/admin/produits', created.id]);
      }
    } catch (e) {
      this.errors.fromApi(e);
    } finally {
      this.saving.set(false);
    }
  }

  private async saveIcon(productId: number, file: File): Promise<void> {
    this.iconSaving.set(true);
    try {
      const product = await this.adminProducts.uploadIcon(productId, file);
      this.context?.product.set(product);
      this.pendingIcon = null;
      this.setPreview(null);
    } catch (e) {
      this.iconError.set(apiErrorMessage(e));
    } finally {
      this.iconSaving.set(false);
    }
  }

  private setPreview(url: string | null): void {
    const previous = this.iconPreview();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.iconPreview.set(url);
  }

  private fill(product: Product): void {
    this.name.set(product.name);
    this.form.setValue(
      {
        name: product.name,
        slug: product.slug,
        tagline: product.tagline,
        repositoryUrl: product.repositoryUrl ?? '',
        homepage: product.homepage,
        published: product.published,
      },
      { emitEvent: false },
    );
  }
}

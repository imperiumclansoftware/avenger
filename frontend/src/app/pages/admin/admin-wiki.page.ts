import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { WikiPage, WikiPagePayload } from '../../core/api/models';
import { AdminProductsService } from '../../core/products/admin-products.service';
import { FormErrors } from '../../shared/form-errors';
import { Icon } from '../../shared/icon';
import { MarkdownEditor } from '../../shared/markdown-editor';
import { AdminProductContext } from './admin-product-context';

const NEW_PAGE = 'nouvelle';

/** The wiki of a product: list of pages and editor of the selected one (the home page by default). */
@Component({
  selector: 'app-admin-wiki-page',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, Icon, MarkdownEditor],
  template: `
    @if (context.product(); as product) {
      <div class="wiki">
        <nav aria-label="Pages du wiki">
          <ul>
            @for (p of product.wikiPages; track p.id) {
              <li>
                <a [routerLink]="[base(), p.id]" [class.active]="p.id === editedId()" [attr.aria-current]="p.id === editedId() ? 'page' : null">{{ p.title }}</a>
              </li>
            }
          </ul>
          <a class="btn small" [routerLink]="[base(), newPage]" routerLinkActive="active" ariaCurrentWhenActive="page">Nouvelle page</a>
        </nav>

        <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="pageLoading()">
          <h2>{{ isNew() ? 'Nouvelle page' : 'Modifier la page' }}</h2>
          <div class="field">
            <label for="title">Titre</label>
            <input id="title" type="text" formControlName="title" maxlength="160" [attr.aria-invalid]="!!errors.of('title')" aria-describedby="title-error" />
            @if (errors.of('title'); as error) {
              <span class="field-error" id="title-error">{{ error }}</span>
            }
          </div>
          @if (!page()?.home) {
            <div class="field">
              <label for="slug">Adresse</label>
              <input id="slug" type="text" formControlName="slug" maxlength="160" placeholder="générée à partir du titre" [attr.aria-invalid]="!!errors.of('slug')" aria-describedby="slug-error" />
              @if (errors.of('slug'); as error) {
                <span class="field-error" id="slug-error">{{ error }}</span>
              }
              <span class="hint">/produits/{{ product.slug }}/wiki/{{ form.controls.slug.value || '…' }}</span>
            </div>
          }
          <div class="field">
            <label for="content">Contenu</label>
            <app-markdown-editor inputId="content" formControlName="content" [rows]="22" />
          </div>

          @if (error() ?? errors.general(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
          @if (saved()) {
            <p class="success" role="status">Enregistré.</p>
          }
          <div class="actions">
            <button class="btn primary" type="submit" [disabled]="saving() || pageLoading()">
              @if (saving()) {
                {{ isNew() ? 'Création…' : 'Enregistrement…' }}
              } @else {
                {{ isNew() ? 'Créer la page' : 'Enregistrer' }}
              }
            </button>
            @if (page(); as page) {
              @if (product.published) {
                <a class="btn" [routerLink]="['/produits', product.slug, 'wiki', page.slug]" target="_blank">
                  Voir la page <app-icon name="external" /><span class="visually-hidden"> (nouvel onglet)</span>
                </a>
              }
              @if (!page.home) {
                <button class="btn danger" type="button" [disabled]="saving()" (click)="remove(page)">Supprimer</button>
              }
            }
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .wiki {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: 14rem minmax(0, 1fr);
      align-items: start;

      @media (width < 48rem) {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    ul {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
    }
    li a {
      display: block;
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius);
      color: var(--text-muted);
      text-decoration: none;

      &:hover {
        color: var(--text);
        background: var(--surface);
      }

      &.active {
        color: var(--text);
        background: var(--surface-alt);
        font-weight: 600;
      }
    }
    h2 {
      margin: 0;
    }
    .form {
      max-width: none;
      transition: opacity 0.2s;

      &[aria-busy='true'] {
        opacity: 0.55;
      }
    }
  `,
})
export class AdminWikiPage {
  protected readonly context = inject(AdminProductContext);
  private readonly adminProducts = inject(AdminProductsService);
  private readonly router = inject(Router);

  /** Route parameters */
  readonly id = input.required<string>();
  readonly pageId = input<string>();

  protected readonly newPage = NEW_PAGE;
  protected readonly base = computed(() => `/admin/produits/${this.id()}/wiki`);
  protected readonly isNew = computed(() => this.pageId() === NEW_PAGE);
  /** Page being edited: the one of the URL, or the home page */
  protected readonly editedId = computed(() => {
    const pageId = this.pageId();
    if (pageId === NEW_PAGE) {
      return null;
    }
    return pageId ? Number(pageId) : (this.context.product()?.wikiPages.find((p) => p.home)?.id ?? null);
  });
  protected readonly page = signal<WikiPage | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The page is being fetched: nothing to save yet */
  protected readonly pageLoading = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    slug: ['', Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    content: [''],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form, {
    title: { required: 'Le titre est obligatoire.' },
    slug: { pattern: "L'adresse ne peut contenir que des minuscules sans accents, des chiffres et des tirets (ex. : guide-d-installation)." },
  });

  constructor() {
    effect(() => {
      const productId = Number(this.id());
      const pageId = this.editedId();
      untracked(() => void this.load(productId, pageId));
    });
    this.form.valueChanges.subscribe(() => this.saved.set(false));
  }

  protected async submit(): Promise<void> {
    this.error.set(null);
    if (!this.errors.validate()) {
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload: WikiPagePayload = { ...value, slug: value.slug || null };
    const productId = Number(this.id());
    try {
      const current = this.page();
      const page = current
        ? await this.adminProducts.updateWikiPage(productId, current.id, payload)
        : await this.adminProducts.createWikiPage(productId, payload);
      await this.context.reload();
      if (current) {
        this.fill(page);
        this.saved.set(true);
      } else {
        await this.router.navigate([this.base(), page.id]);
      }
    } catch (e) {
      this.errors.fromApi(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(page: WikiPage): Promise<void> {
    if (!confirm(`Supprimer la page « ${page.title} » ?`)) {
      return;
    }
    this.saving.set(true);
    try {
      await this.adminProducts.removeWikiPage(Number(this.id()), page.id);
      await this.context.reload();
      await this.router.navigate([this.base()]);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  private async load(productId: number, pageId: number | null): Promise<void> {
    this.error.set(null);
    this.saved.set(false);
    this.page.set(null);
    this.form.reset({ title: '', slug: '', content: '' });
    if (pageId === null) {
      return;
    }
    this.pageLoading.set(true);
    try {
      this.fill(await this.adminProducts.wikiPage(productId, pageId));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Page introuvable.'));
    } finally {
      this.pageLoading.set(false);
    }
  }

  private fill(page: WikiPage): void {
    this.page.set(page);
    this.form.setValue({ title: page.title, slug: page.slug, content: page.content }, { emitEvent: false });
  }
}

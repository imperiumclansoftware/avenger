import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Ticket, TicketType } from '../core/api/models';
import { ProductsService } from '../core/products/products.service';
import { FormErrors } from './form-errors';
import { MarkdownEditor } from './markdown-editor';
import { TICKET_TYPES } from './tickets';

/** Values given by the page that opens the form (the public area, or the app embedding the widget) */
export interface TicketPrefill {
  type?: TicketType | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Form to open a ticket without an account: in the public area, and in the widget embedded
 * by other apps (see public/widget.js). The actions next to "Envoyer" are projected.
 */
@Component({
  selector: 'app-ticket-form',
  imports: [ReactiveFormsModule, MarkdownEditor],
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <fieldset class="types">
        <legend>Type de ticket</legend>
        @for (t of types; track t.value) {
          <label class="type card">
            <input type="radio" formControlName="type" [value]="t.value" />
            <span>
              <strong>{{ t.label }}</strong>
              <span class="muted">{{ t.description }}</span>
            </span>
          </label>
        }
        @if (errors.of('type'); as error) {
          <span class="field-error">{{ error }}</span>
        }
      </fieldset>

      <div class="field">
        <label for="title">Titre</label>
        <input id="title" type="text" formControlName="title" maxlength="200" [attr.aria-invalid]="!!errors.of('title')" aria-describedby="title-error" />
        @if (errors.of('title'); as error) {
          <span class="field-error" id="title-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="description">Description</label>
        <span class="hint">Pour un bug : ce que vous avez fait, ce qui s'est passé, ce que vous attendiez.</span>
        <app-markdown-editor inputId="description" formControlName="description" [rows]="rows()" />
        @if (errors.of('description'); as error) {
          <span class="field-error" id="description-error">{{ error }}</span>
        }
      </div>
      <div class="row">
        <div class="field">
          <label for="authorName">Votre nom</label>
          <input id="authorName" type="text" formControlName="authorName" maxlength="100" autocomplete="name" [attr.aria-invalid]="!!errors.of('authorName')" aria-describedby="authorName-error" />
          @if (errors.of('authorName'); as error) {
            <span class="field-error" id="authorName-error">{{ error }}</span>
          }
        </div>
        <div class="field">
          <label for="authorEmail">Votre e-mail</label>
          <input id="authorEmail" type="email" formControlName="authorEmail" maxlength="180" autocomplete="email" [attr.aria-invalid]="!!errors.of('authorEmail')" aria-describedby="authorEmail-error" />
          @if (errors.of('authorEmail'); as error) {
            <span class="field-error" id="authorEmail-error">{{ error }}</span>
          }
          <span class="hint">Il n'est pas publié : il sert seulement à vous recontacter.</span>
        </div>
      </div>
      @if (sourceUrl(); as url) {
        <p class="hint source">L'adresse de la page d'où vous écrivez sera jointe au ticket : {{ url }}</p>
      }

      @if (errors.general(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      <div class="actions">
        <button class="btn primary" type="submit" [disabled]="saving()">Envoyer</button>
        <ng-content />
      </div>
    </form>
  `,
  styles: `
    .types {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      border: none;
      padding: 0;
      margin: 0;

      legend {
        font-weight: 600;
        margin-bottom: 0.3rem;
      }
    }
    .type {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      cursor: pointer;
      padding: 0.75rem;

      &:has(input:checked) {
        border-color: var(--accent);
      }

      span {
        display: grid;
        font-size: 0.9rem;
      }
    }
    .row {
      display: grid;
      gap: 1rem;
      align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    }
    .source {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
  `,
})
export class TicketForm {
  private readonly productsService = inject(ProductsService);

  readonly slug = input.required<string>();
  readonly prefill = input<TicketPrefill>({});
  /** Page of the embedding app, appended to the description (widget) */
  readonly sourceUrl = input<string | null>(null);
  readonly rows = input(10);
  readonly created = output<Ticket>();

  protected readonly types = TICKET_TYPES;
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['bug' as TicketType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.required],
    authorName: ['', [Validators.required, Validators.maxLength(100)]],
    authorEmail: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form, {
    title: { required: 'Donnez un titre au ticket.' },
    description: { required: 'Décrivez votre demande.' },
    authorName: { required: 'Votre nom est obligatoire.' },
    authorEmail: { required: 'Votre e-mail est obligatoire.' },
  });

  constructor() {
    effect(() => {
      const prefill = this.prefill();
      untracked(() => this.applyPrefill(prefill));
    });
  }

  protected async submit(): Promise<void> {
    if (!this.errors.validate()) {
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const source = this.sourceUrl();
    try {
      const ticket = await this.productsService.openTicket(this.slug(), {
        ...value,
        description: source ? `${value.description}\n\n---\n*Envoyé depuis ${source}*` : value.description,
      });
      this.created.emit(ticket);
    } catch (e) {
      this.errors.fromApi(e);
      this.saving.set(false);
    }
  }

  /** Fills the fields still empty: what the visitor already typed wins. */
  private applyPrefill(prefill: TicketPrefill): void {
    const { controls } = this.form;
    if (prefill.type && TICKET_TYPES.some((t) => t.value === prefill.type) && controls.type.pristine) {
      controls.type.setValue(prefill.type);
    }
    if (prefill.name && !controls.authorName.value) {
      controls.authorName.setValue(prefill.name.slice(0, 100));
    }
    if (prefill.email && !controls.authorEmail.value) {
      controls.authorEmail.setValue(prefill.email.slice(0, 180));
    }
  }
}

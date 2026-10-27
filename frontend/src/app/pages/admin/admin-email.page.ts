import { Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../core/api/api-error';
import { AdminSettings } from '../../core/api/models';
import { AdminSettingsService } from '../../core/admin/admin-settings.service';
import { FormErrors } from '../../shared/form-errors';
import { AdminMail } from './admin-mail';

/** Mail service of Avenger, and its public address for the links of the e-mails. */
@Component({
  selector: 'app-admin-email-page',
  imports: [ReactiveFormsModule, AdminMail],
  template: `
    <h1>E-mail</h1>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (settings(); as s) {
      <form class="card general" [formGroup]="form" (ngSubmit)="saveGeneral()" novalidate aria-labelledby="general-title">
        <h2 id="general-title">Adresse publique d'Avenger</h2>
        <p class="muted">Utilisée dans les liens des e-mails (suivre un ticket, gérer les tickets). Sans elle, les e-mails partent sans lien.</p>
        <div class="field">
          <label for="app-url">Adresse</label>
          <input id="app-url" type="url" formControlName="appUrl" placeholder="https://avenger.example.org" [attr.aria-invalid]="!!errors.of('appUrl')" aria-describedby="app-url-hint app-url-error" />
          @if (errors.of('appUrl'); as error) {
            <span class="field-error" id="app-url-error">{{ error }}</span>
          }
          <span class="hint" id="app-url-hint">
            @if (s.general.appUrl.source === 'env') {
              Issue de la variable APP_PUBLIC_URL.
            } @else if (!s.general.appUrl.value) {
              Proposée : l'adresse de cette page. Vérifiez-la, puis enregistrez.
            }
          </span>
        </div>
        @if (generalSaved()) {
          <p class="saved" role="status">Adresse enregistrée.</p>
        }
        <div class="actions"><button class="btn primary" type="submit" [disabled]="busy()">Enregistrer</button></div>
      </form>
      <app-admin-mail [mail]="s.mail" (saved)="settings.set($event)" />
    } @else {
      <p class="muted">Chargement…</p>
    }
  `,
  styles: `
    h1 {
      margin-top: 0;
    }
    .general {
      display: grid;
      gap: 0.9rem;
      max-width: 48rem;
      margin-bottom: 1.25rem;

      h2,
      p {
        margin: 0;
      }
    }
    .saved {
      color: var(--success);
    }
  `,
})
export class AdminEmailPage {
  private readonly admin = inject(AdminSettingsService);
  /** This page's address, minus the admin path: what visitors type to reach Avenger */
  private readonly guessedUrl = new URL('.', inject(DOCUMENT).baseURI).href;

  protected readonly settings = signal<AdminSettings | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly generalSaved = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    appUrl: ['', Validators.pattern(/^https?:\/\/\S+$/)],
  });
  protected readonly errors = new FormErrors<'appUrl'>(this.form, {
    appUrl: { pattern: "L'adresse commence par http:// ou https:// (ex. : https://avenger.example.org)." },
  });

  constructor() {
    this.admin.settings().then(
      (settings) => {
        this.settings.set(settings);
        this.form.setValue({ appUrl: settings.general.appUrl.value ?? this.guessedUrl });
      },
      (e: unknown) => this.error.set(apiErrorMessage(e)),
    );
    this.form.valueChanges.subscribe(() => this.generalSaved.set(false));
  }

  protected async saveGeneral(): Promise<void> {
    if (!this.errors.validate()) {
      return;
    }
    this.busy.set(true);
    try {
      this.settings.set(await this.admin.saveGeneral(this.form.getRawValue().appUrl.trim() || null));
      this.generalSaved.set(true);
    } catch (e) {
      this.errors.fromApi(e);
    } finally {
      this.busy.set(false);
    }
  }
}

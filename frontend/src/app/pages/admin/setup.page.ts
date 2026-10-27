import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FormErrors } from '../../shared/form-errors';

/** The confirmation must repeat the password */
function samePassword(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  return control.value && control.value !== password ? { mismatch: true } : null;
}

/**
 * Installation wizard: the code shown on the server, then the first administrator's account.
 */
@Component({
  selector: 'app-setup-page',
  imports: [ReactiveFormsModule],
  template: `
    <main class="setup">
      <p class="brand">Avenger</p>
      <div class="card">
        <p class="eyebrow">Installation · étape {{ step() }} sur 2</p>

        @if (step() === 1) {
          <form class="form" [formGroup]="codeForm" (ngSubmit)="verify()" novalidate>
            <h1>Bienvenue</h1>
            <p class="muted">
              Pour que seul l'administrateur du serveur puisse installer Avenger, saisissez le
              <strong>code d'installation</strong>. Il s'affiche dans les journaux du serveur :
            </p>
            <pre>docker compose logs avenger</pre>
            <p class="muted small">ou : <code>php bin/console app:setup:code</code></p>
            <div class="field">
              <label for="code">Code d'installation</label>
              <input id="code" type="text" formControlName="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH" maxlength="32" [attr.aria-invalid]="!!codeErrors.of('code')" aria-describedby="code-error" />
              @if (codeErrors.of('code'); as error) {
                <span class="field-error" id="code-error">{{ error }}</span>
              }
            </div>
            @if (codeErrors.general(); as error) {
              <p class="error" role="alert">{{ error }}</p>
            }
            <button class="btn primary" type="submit" [disabled]="busy()">Continuer <span class="arrow" aria-hidden="true">→</span></button>
          </form>
        } @else {
          <form class="form" [formGroup]="accountForm" (ngSubmit)="install()" novalidate>
            <h1>Le premier administrateur</h1>
            <p class="muted">Ce compte gère les produits, leur wiki et leurs tickets. D'autres comptes se créent ensuite en ligne de commande.</p>
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" type="email" formControlName="email" autocomplete="username" maxlength="180" [attr.aria-invalid]="!!accountErrors.of('email')" aria-describedby="email-error" />
              @if (accountErrors.of('email'); as error) {
                <span class="field-error" id="email-error">{{ error }}</span>
              }
            </div>
            <div class="field">
              <label for="password">Mot de passe</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="!!accountErrors.of('password')" aria-describedby="password-hint password-error" />
              <span class="hint" id="password-hint">12 caractères minimum. Une phrase de quelques mots fait un bon mot de passe.</span>
              @if (accountErrors.of('password'); as error) {
                <span class="field-error" id="password-error">{{ error }}</span>
              }
            </div>
            <div class="field">
              <label for="confirm">Confirmation du mot de passe</label>
              <input id="confirm" type="password" formControlName="confirm" autocomplete="new-password" [attr.aria-invalid]="!!accountErrors.of('confirm')" aria-describedby="confirm-error" />
              @if (accountErrors.of('confirm'); as error) {
                <span class="field-error" id="confirm-error">{{ error }}</span>
              }
            </div>
            @if (accountErrors.general(); as error) {
              <p class="error" role="alert">{{ error }}</p>
            }
            <div class="actions">
              <button class="btn primary" type="submit" [disabled]="busy()">Installer Avenger</button>
              <button class="btn" type="button" (click)="step.set(1)">Retour</button>
            </div>
          </form>
        }
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
      background: radial-gradient(ellipse 45% 40% at 50% 45%, rgb(31 98 240 / 0.16), transparent 70%);
    }
    .setup {
      min-height: 100dvh;
      display: grid;
      place-content: center;
      gap: 1.5rem;
      padding: 1rem;
      width: min(100%, 30rem);
      margin: 0 auto;
    }
    .brand {
      margin: 0;
      text-align: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.75rem;
      text-shadow: 0 0 1.25rem rgb(31 98 240 / 0.8);
    }
    .card {
      padding: 1.75rem;
    }
    .eyebrow {
      margin: 0 0 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
    }
    pre {
      margin: 0;
      padding: 0.6rem 0.8rem;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: var(--bg-band);
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }
    code {
      font-family: var(--font-mono);
    }
    .small {
      font-size: 0.85rem;
    }
    #code {
      font-family: var(--font-mono);
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
  `,
})
export class SetupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly step = signal<1 | 2>(1);
  protected readonly busy = signal(false);

  protected readonly codeForm = this.fb.group({ code: ['', Validators.required] });
  protected readonly codeErrors = new FormErrors<'code'>(this.codeForm, {
    code: { required: "Saisissez le code d'installation." },
  });

  protected readonly accountForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    confirm: ['', [Validators.required, samePassword]],
  });
  protected readonly accountErrors = new FormErrors<keyof typeof this.accountForm.controls>(this.accountForm, {
    email: { required: "L'e-mail est obligatoire." },
    password: { required: 'Choisissez un mot de passe.', minlength: 'Le mot de passe doit faire au moins 12 caractères.' },
    confirm: { required: 'Confirmez le mot de passe.', mismatch: 'Les deux mots de passe ne correspondent pas.' },
  });

  constructor() {
    // Typed again after the confirmation: check it again
    this.accountForm.controls.password.valueChanges.subscribe(() =>
      this.accountForm.controls.confirm.updateValueAndValidity({ emitEvent: false }),
    );
  }

  protected async verify(): Promise<void> {
    if (!this.codeErrors.validate()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.verifySetupCode(this.codeForm.getRawValue().code);
      this.step.set(2);
    } catch (e) {
      this.showCodeError(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async install(): Promise<void> {
    if (!this.accountErrors.validate()) {
      return;
    }
    this.busy.set(true);
    const { email, password } = this.accountForm.getRawValue();
    try {
      await this.auth.install({ code: this.codeForm.getRawValue().code, email, password });
      await this.router.navigate(['/admin']);
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) {
        // Installed meanwhile (another tab): nothing to do here any more
        await this.router.navigate(['/admin/connexion']);
        return;
      }
      if (e instanceof HttpErrorResponse && (e.status === 403 || e.status === 429)) {
        this.step.set(1);
        this.showCodeError(e);
      } else {
        this.accountErrors.fromApi(e);
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** A wrong code, or too many attempts: said under the field. */
  private showCodeError(e: unknown): void {
    if (e instanceof HttpErrorResponse && e.status === 409) {
      void this.router.navigate(['/admin/connexion']);
      return;
    }
    this.codeErrors.fromApi(e);
  }
}

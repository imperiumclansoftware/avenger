import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FormErrors } from '../../shared/form-errors';

function samePassword(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('newPassword')?.value;
  return control.value && control.value !== password ? { mismatch: true } : null;
}

/** The connected administrator: e-mail notifications and password. */
@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Mon compte</h1>
    <p class="muted">{{ auth.user()?.email }}</p>

    <section class="card" aria-labelledby="notif-title">
      <h2 id="notif-title">Notifications</h2>
      <label class="checkbox">
        <input type="checkbox" [checked]="auth.user()?.notifyNewTickets" [disabled]="notifBusy()" (change)="saveNotifications($event)" />
        Recevoir un e-mail à chaque nouveau ticket, sur tous les produits
      </label>
      <p class="hint">« Répondre » dans votre messagerie écrit directement à l'auteur du ticket.</p>
      @if (notifStatus(); as status) {
        <p [class]="status.kind" [attr.role]="status.kind === 'error' ? 'alert' : 'status'">{{ status.message }}</p>
      }
    </section>

    <form class="card form" [formGroup]="form" (ngSubmit)="changePassword()" novalidate aria-labelledby="password-title">
      <h2 id="password-title">Mot de passe</h2>
      <div class="field">
        <label for="current-password">Mot de passe actuel</label>
        <input id="current-password" type="password" formControlName="currentPassword" autocomplete="current-password" [attr.aria-invalid]="!!errors.of('currentPassword')" aria-describedby="current-password-error" />
        @if (errors.of('currentPassword'); as error) {
          <span class="field-error" id="current-password-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="new-password">Nouveau mot de passe</label>
        <input id="new-password" type="password" formControlName="newPassword" autocomplete="new-password" [attr.aria-invalid]="!!errors.of('newPassword')" aria-describedby="new-password-hint new-password-error" />
        <span class="hint" id="new-password-hint">12 caractères minimum.</span>
        @if (errors.of('newPassword'); as error) {
          <span class="field-error" id="new-password-error">{{ error }}</span>
        }
      </div>
      <div class="field">
        <label for="confirm-password">Confirmation</label>
        <input id="confirm-password" type="password" formControlName="confirm" autocomplete="new-password" [attr.aria-invalid]="!!errors.of('confirm')" aria-describedby="confirm-password-error" />
        @if (errors.of('confirm'); as error) {
          <span class="field-error" id="confirm-password-error">{{ error }}</span>
        }
      </div>
      @if (errors.general(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (passwordChanged()) {
        <p class="success" role="status">Mot de passe changé.</p>
      }
      <div class="actions"><button class="btn primary" type="submit" [disabled]="busy()">{{ busy() ? 'Changement…' : 'Changer le mot de passe' }}</button></div>
    </form>
  `,
  styles: `
    h1 {
      margin: 0;
    }
    section,
    form {
      max-width: 40rem;
      margin-top: 1.25rem;
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.2rem;
    }
    .hint {
      margin: 0.4rem 0 0;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);

  protected readonly busy = signal(false);
  protected readonly notifBusy = signal(false);
  protected readonly passwordChanged = signal(false);
  protected readonly notifStatus = signal<{ kind: 'success' | 'error'; message: string } | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
    confirm: ['', [Validators.required, samePassword]],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form, {
    currentPassword: { required: 'Saisissez votre mot de passe actuel.' },
    newPassword: { required: 'Choisissez un nouveau mot de passe.', minlength: 'Le mot de passe doit faire au moins 12 caractères.' },
    confirm: { required: 'Confirmez le mot de passe.', mismatch: 'Les deux mots de passe ne correspondent pas.' },
  });

  constructor() {
    this.form.controls.newPassword.valueChanges.subscribe(() =>
      this.form.controls.confirm.updateValueAndValidity({ emitEvent: false }),
    );
    this.form.valueChanges.subscribe(() => this.passwordChanged.set(false));
  }

  protected async saveNotifications(event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    this.notifBusy.set(true);
    this.notifStatus.set(null);
    try {
      await this.auth.saveNotifications(checked);
      this.notifStatus.set({ kind: 'success', message: checked ? 'Vous serez prévenu de chaque nouveau ticket.' : 'Vous ne recevrez plus d\'e-mail pour les nouveaux tickets.' });
    } catch (e) {
      this.notifStatus.set({ kind: 'error', message: apiErrorMessage(e) });
    } finally {
      this.notifBusy.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    if (!this.errors.validate()) {
      return;
    }
    this.busy.set(true);
    try {
      const { currentPassword, newPassword } = this.form.getRawValue();
      await this.auth.changePassword(currentPassword, newPassword);
      this.form.reset({ currentPassword: '', newPassword: '', confirm: '' });
      this.passwordChanged.set(true);
    } catch (e) {
      this.errors.fromApi(e);
    } finally {
      this.busy.set(false);
    }
  }
}

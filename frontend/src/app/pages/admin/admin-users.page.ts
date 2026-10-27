import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../core/api/api-error';
import { Me } from '../../core/api/models';
import { AdminUsersService } from '../../core/admin/admin-users.service';
import { AuthService } from '../../core/auth/auth.service';
import { FormErrors } from '../../shared/form-errors';

/** The administrators: list, addition, removal (never one's own account, never the last one). */
@Component({
  selector: 'app-admin-users-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Utilisateurs</h1>
    <p class="muted">Chaque administrateur gère tous les produits, leur wiki et leurs tickets.</p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (users(); as users) {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>E-mail</th><th>Ajouté le</th><th>Nouveaux tickets</th><th><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            @for (user of users; track user.id) {
              <tr>
                <td>{{ user.email }} @if (user.id === auth.user()?.id) { <span class="badge">vous</span> }</td>
                <td>{{ user.createdAt ? date(user.createdAt) : '—' }}</td>
                <td>{{ user.notifyNewTickets ? 'prévenu par e-mail' : 'pas d\\'e-mail' }}</td>
                <td class="actions-cell">
                  @if (user.id !== auth.user()?.id) {
                    <button class="btn small danger" type="button" (click)="remove(user)">Retirer</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!error()) {
      <p class="muted">Chargement…</p>
    }

    <form class="card form add" [formGroup]="form" (ngSubmit)="add()" novalidate aria-labelledby="add-title">
      <h2 id="add-title">Ajouter un administrateur</h2>
      <div class="row">
        <div class="field">
          <label for="user-email">E-mail</label>
          <input id="user-email" type="email" formControlName="email" autocomplete="off" maxlength="180" [attr.aria-invalid]="!!errors.of('email')" aria-describedby="user-email-error" />
          @if (errors.of('email'); as error) {
            <span class="field-error" id="user-email-error">{{ error }}</span>
          }
        </div>
        <div class="field">
          <label for="user-password">Mot de passe</label>
          <input id="user-password" type="password" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="!!errors.of('password')" aria-describedby="user-password-hint user-password-error" />
          <span class="hint" id="user-password-hint">12 caractères minimum. Transmettez-le de façon sûre ; il pourra le changer dans Mon compte.</span>
          @if (errors.of('password'); as error) {
            <span class="field-error" id="user-password-error">{{ error }}</span>
          }
        </div>
      </div>
      @if (errors.general(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (added()) {
        <p class="saved" role="status">{{ added() }} peut maintenant se connecter.</p>
      }
      <div class="actions"><button class="btn primary" type="submit" [disabled]="busy()">Ajouter</button></div>
    </form>
  `,
  styles: `
    h1 {
      margin-top: 0;
    }
    .actions-cell {
      text-align: right;
    }
    .add {
      margin-top: 1.75rem;
      max-width: none;

      h2 {
        margin: 0;
        font-size: 1.2rem;
      }
    }
    .row {
      display: grid;
      gap: 1rem;
      align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    }
    .saved {
      color: var(--success);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class AdminUsersPage {
  private readonly adminUsers = inject(AdminUsersService);
  protected readonly auth = inject(AuthService);

  protected readonly users = signal<Me[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly added = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form, {
    email: { required: "L'e-mail est obligatoire." },
    password: { required: 'Choisissez un mot de passe.', minlength: 'Le mot de passe doit faire au moins 12 caractères.' },
  });

  constructor() {
    void this.load();
    this.form.valueChanges.subscribe(() => this.added.set(null));
  }

  protected async add(): Promise<void> {
    if (!this.errors.validate()) {
      return;
    }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.adminUsers.create(email.trim(), password);
      this.form.reset({ email: '', password: '' });
      this.added.set(user.email);
      await this.load();
    } catch (e) {
      this.errors.fromApi(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(user: Me): Promise<void> {
    if (!confirm(`Retirer l'administrateur ${user.email} ? Il ne pourra plus se connecter.`)) {
      return;
    }
    this.error.set(null);
    try {
      await this.adminUsers.remove(user.id);
      await this.load();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  private async load(): Promise<void> {
    try {
      this.users.set(await this.adminUsers.list());
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }
}

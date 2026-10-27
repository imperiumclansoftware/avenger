import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FormErrors } from '../../shared/form-errors';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="login">
      <a routerLink="/" class="brand">Avenger</a>
      <form class="card form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Administration</h1>
        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" [attr.aria-invalid]="!!errors.of('email')" aria-describedby="email-error" />
          @if (errors.of('email'); as error) {
            <span class="field-error" id="email-error">{{ error }}</span>
          }
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="!!errors.of('password')" aria-describedby="password-error" />
          @if (errors.of('password'); as error) {
            <span class="field-error" id="password-error">{{ error }}</span>
          }
        </div>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button class="btn primary" type="submit" [disabled]="loading()">{{ loading() ? 'Connexion…' : 'Se connecter' }}</button>
      </form>
    </main>
  `,
  styles: `
    :host {
      display: block;
      background: radial-gradient(ellipse 45% 40% at 50% 45%, rgb(31 98 240 / 0.16), transparent 70%);
    }
    .login {
      min-height: 100dvh;
      display: grid;
      place-content: center;
      gap: 1.5rem;
      padding: 1rem;
      width: min(100%, 24rem);
      margin: 0 auto;
    }
    .brand {
      text-align: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.75rem;
      color: var(--text);
      text-decoration: none;
      text-shadow: 0 0 1.25rem rgb(31 98 240 / 0.8);
    }
    h1 {
      margin: 0;
      font-size: 1.3rem;
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Query parameter: page asked before logging in */
  readonly retour = input<string>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly errors = new FormErrors<keyof typeof this.form.controls>(this.form);

  protected async submit(): Promise<void> {
    this.error.set(null);
    if (!this.errors.validate()) {
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      if (!this.auth.isAdmin()) {
        this.auth.logout();
        throw new Error();
      }
      const target = this.retour();
      await this.router.navigateByUrl(target?.startsWith('/admin') ? target : '/admin');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'Ce compte n\'a pas accès à l\'administration.'));
      this.loading.set(false);
    }
  }
}

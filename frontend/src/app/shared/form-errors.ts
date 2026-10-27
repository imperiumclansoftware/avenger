import { signal } from '@angular/core';
import { FormGroup, ValidationErrors } from '@angular/forms';
import { apiErrorMessage, apiViolations } from '../core/api/api-error';

/** Messages of the validators of a field, by error key (required, pattern…) */
export type FieldMessages = Partial<Record<string, string>>;

/**
 * Errors of a form, shown under each field: those of the validators once the field is touched
 * (or the form submitted), and those returned by the API for that field.
 */
export class FormErrors<T extends string> {
  /** Error of the API that concerns no field of the form */
  readonly general = signal<string | null>(null);

  private readonly submitted = signal(false);
  private readonly server = signal<Partial<Record<string, string>>>({});

  constructor(
    private readonly form: FormGroup,
    private readonly messages: Partial<Record<T, FieldMessages>> = {},
  ) {
    for (const [name, control] of Object.entries(form.controls)) {
      // The error of the API no longer applies once the field changes
      control.valueChanges.subscribe(() => {
        if (this.server()[name]) {
          this.server.update(({ [name]: _, ...others }) => others);
        }
      });
    }
  }

  /** Error to show under the field, if any. */
  of(name: T): string | null {
    const control = this.form.get(name);
    if (control?.errors && (control.touched || this.submitted())) {
      return this.message(name, control.errors);
    }
    return this.server()[name] ?? null;
  }

  /** Before sending: shows every error. Returns whether the form can be sent. */
  validate(): boolean {
    this.submitted.set(true);
    this.general.set(null);
    this.form.markAllAsTouched();
    return this.form.valid;
  }

  /** After a failed request: errors of the fields under them, the others above the button. */
  fromApi(error: unknown): void {
    const violations = apiViolations(error);
    const fields = Object.keys(this.form.controls);
    this.server.set(Object.fromEntries(Object.entries(violations).filter(([path]) => fields.includes(path))));
    const others = Object.entries(violations)
      .filter(([path]) => !fields.includes(path))
      .map(([, message]) => message);
    this.general.set(
      others.length ? others.join(' ') : Object.keys(violations).length ? null : apiErrorMessage(error),
    );
  }

  private message(name: T, errors: ValidationErrors): string {
    const key = Object.keys(errors)[0];
    const custom = this.messages[name]?.[key];
    if (custom) {
      return custom;
    }
    switch (key) {
      case 'required':
        return 'Ce champ est obligatoire.';
      case 'maxlength':
        return `${errors[key].requiredLength} caractères maximum.`;
      case 'minlength':
        return `${errors[key].requiredLength} caractères minimum.`;
      case 'email':
        return "L'e-mail n'est pas valide.";
      default:
        return "Cette valeur n'est pas valide.";
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormErrors } from './form-errors';

describe('FormErrors', () => {
  function setup() {
    const form = new FormGroup({
      name: new FormControl('', { nonNullable: true, validators: Validators.required }),
      slug: new FormControl('', { nonNullable: true, validators: Validators.pattern(/^[a-z-]+$/) }),
    });
    const errors = new FormErrors<'name' | 'slug'>(form, { slug: { pattern: 'Adresse invalide.' } });
    return { form, errors };
  }

  function violations(...list: [string, string][]): HttpErrorResponse {
    return new HttpErrorResponse({
      status: 422,
      error: { violations: list.map(([propertyPath, title]) => ({ propertyPath, title })) },
    });
  }

  it('shows the errors of the validators once the form is submitted', () => {
    const { form, errors } = setup();
    form.controls.slug.setValue('Mon Projet');
    expect(errors.of('name')).toBeNull();

    expect(errors.validate()).toBe(false);
    expect(errors.of('name')).toBe('Ce champ est obligatoire.');
    expect(errors.of('slug')).toBe('Adresse invalide.');
  });

  it('puts the errors of the API under their field until it changes', () => {
    const { form, errors } = setup();
    errors.fromApi(violations(['slug', 'Déjà utilisée.'], ['other', 'Autre problème.']));

    expect(errors.of('slug')).toBe('Déjà utilisée.');
    expect(errors.general()).toBe('Autre problème.');

    form.controls.slug.setValue('autre');
    expect(errors.of('slug')).toBeNull();
  });

  it('shows other API errors above the button', () => {
    const { errors } = setup();
    errors.fromApi(new HttpErrorResponse({ status: 0 }));
    expect(errors.general()).toBe('Impossible de joindre le serveur.');
  });
});

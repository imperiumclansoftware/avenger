import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Markdown } from './markdown';

/** Markdown text area with a preview tab, usable as a form control. */
@Component({
  selector: 'app-markdown-editor',
  imports: [Markdown],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MarkdownEditor), multi: true },
  ],
  template: `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" [attr.aria-selected]="!preview()" (click)="preview.set(false)">
        Écrire
      </button>
      <button type="button" role="tab" [attr.aria-selected]="preview()" (click)="preview.set(true)">
        Aperçu
      </button>
      <span class="hint">Markdown</span>
    </div>
    @if (preview()) {
      <div class="preview">
        @if (value()) {
          <app-markdown [content]="value()" />
        } @else {
          <p class="muted">Rien à afficher.</p>
        }
      </div>
    } @else {
      <textarea
        [id]="inputId()"
        [rows]="rows()"
        [value]="value()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      ></textarea>
    }
  `,
  styleUrl: './markdown-editor.scss',
})
export class MarkdownEditor implements ControlValueAccessor {
  readonly inputId = input<string>();
  readonly rows = input(14);

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly preview = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}

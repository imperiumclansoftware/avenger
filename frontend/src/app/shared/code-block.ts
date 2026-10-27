import { Component, input, signal } from '@angular/core';
import { Icon } from './icon';

/** Code to copy, with a "Copier" button. */
@Component({
  selector: 'app-code-block',
  imports: [Icon],
  template: `
    <div class="code">
      <pre><code>{{ code() }}</code></pre>
      <button class="btn small" type="button" (click)="copy()" aria-live="polite">
        @if (copied()) {
          <app-icon name="check" /> Copié
        } @else {
          Copier
        }
      </button>
    </div>
  `,
  styles: `
    .code {
      position: relative;
    }
    pre {
      margin: 0;
      padding: 1rem 1.1rem;
      padding-right: 6rem;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 0.6rem;
      background: var(--bg-band);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.55;
    }
    button {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      min-width: 5.25rem;
      background: var(--surface);
    }
  `,
})
export class CodeBlock {
  readonly code = input.required<string>();
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard refused (insecure context): the code stays selectable
    }
  }
}

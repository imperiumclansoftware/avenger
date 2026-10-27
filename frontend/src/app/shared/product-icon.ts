import { Component, computed, input } from '@angular/core';

/**
 * Icon of a product, or the initial of its name in a neon ring. Decorative: the name is
 * always written next to it.
 */
@Component({
  selector: 'app-product-icon',
  template: `
    @if (src(); as src) {
      <img [src]="src" alt="" [width]="size()" [height]="size()" decoding="async" />
    } @else {
      <span class="initial" aria-hidden="true">{{ initial() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      width: var(--icon-size);
      height: var(--icon-size);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 22%;
    }
    .initial {
      display: grid;
      place-items: center;
      border: 1.5px solid var(--accent-bright);
      border-radius: 50%;
      color: var(--accent-bright);
      font-family: var(--font-display);
      font-size: calc(var(--icon-size) * 0.45);
      font-weight: 700;
      box-shadow:
        var(--glow),
        inset 0 0 0.75rem rgb(31 98 240 / 0.35);
    }
  `,
  host: { '[style.--icon-size.px]': 'size()' },
})
export class ProductIcon {
  readonly product = input.required<{ name: string; iconUrl: string | null }>();
  readonly size = input(48);
  /** Shown instead of the saved icon, e.g. the preview of a file being chosen */
  readonly preview = input<string | null>(null);

  protected readonly src = computed(() => this.preview() ?? this.product().iconUrl);
  protected readonly initial = computed(() => this.product().name.trim().charAt(0).toUpperCase() || '?');
}

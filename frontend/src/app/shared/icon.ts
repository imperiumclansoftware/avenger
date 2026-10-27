import { Component, input } from '@angular/core';

export type IconName = 'arrow-right' | 'arrow-left' | 'external' | 'check' | 'cross' | 'alert';

/**
 * A small line icon, in the round stroke of the brand mark. Decorative: the text next to it says
 * what it means (sized by the text: 1em, see styles.scss).
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('arrow-right') {
          <path d="M5 12h14M13 6l6 6-6 6" />
        }
        @case ('arrow-left') {
          <path d="M19 12H5M11 6l-6 6 6 6" />
        }
        @case ('external') {
          <path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
        }
        @case ('check') {
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        }
        @case ('cross') {
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        }
      }
    </svg>
  `,
  styles: `
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}

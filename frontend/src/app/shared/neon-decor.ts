import { Component } from '@angular/core';

/** Glowing blue waves, at the bottom of a hero band. Decorative. */
@Component({
  selector: 'app-neon-waves',
  template: `
    <svg viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wave-stroke" x1="0" x2="1">
          <stop offset="0" stop-color="#1f62f0" stop-opacity="0" />
          <stop offset="0.35" stop-color="#3d86ff" />
          <stop offset="0.7" stop-color="#1f62f0" />
          <stop offset="1" stop-color="#1f62f0" stop-opacity="0" />
        </linearGradient>
      </defs>
      @for (wave of waves; track $index) {
        <path [attr.d]="wave.d" [attr.stroke-opacity]="wave.opacity" stroke="url(#wave-stroke)" fill="none" stroke-width="1.5" />
      }
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      inset: auto 0 0;
      height: 11rem;
      pointer-events: none;
    }
    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 0.4rem rgb(31 98 240 / 0.8));
    }
  `,
})
export class NeonWaves {
  protected readonly waves = Array.from({ length: 9 }, (_, i) => ({
    d: `M0 ${170 + i * 6} C 320 ${60 + i * 14}, 620 ${250 - i * 8}, 940 ${130 + i * 10} S 1300 ${70 + i * 12}, 1440 ${120 + i * 9}`,
    opacity: 0.25 + (i % 3) * 0.25,
  }));
}

/** "</>" drawn in neon outline: a nod to open source code. Decorative. */
@Component({
  selector: 'app-neon-code',
  template: `
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#1f62f0" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
        <path d="M70 30 L20 80 L70 130" />
        <path d="M170 30 L220 80 L170 130" />
        <path d="M140 18 L100 142" />
      </g>
      <g fill="none" stroke="#3d86ff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(7 7)" opacity="0.8">
        <path d="M70 30 L20 80 L70 130" />
        <path d="M170 30 L220 80 L170 130" />
        <path d="M140 18 L100 142" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      filter: drop-shadow(0 0 0.6rem rgb(31 98 240 / 0.9));
    }
  `,
})
export class NeonCode {}

/** Round chevron button-like mark, as on the feature list of the design. Decorative. */
@Component({
  selector: 'app-chevron-mark',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow:
        inset 0 0 0 0.3rem var(--bg-band),
        var(--glow-soft);
      color: var(--text);
    }
    svg {
      width: 1.1rem;
    }
  `,
})
export class ChevronMark {}

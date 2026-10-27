import { Component, computed, input } from '@angular/core';
import { marked } from 'marked';

/**
 * Renders Markdown. The HTML goes through Angular's sanitizer ([innerHTML]): no scripts, no event handlers.
 */
@Component({
  selector: 'app-markdown',
  template: `<div class="markdown" [innerHTML]="html()"></div>`,
})
export class Markdown {
  readonly content = input('');

  protected readonly html = computed(
    () => marked.parse(this.content(), { async: false, gfm: true, breaks: true }) as string,
  );
}

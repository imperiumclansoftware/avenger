import { TestBed } from '@angular/core/testing';
import { Markdown } from './markdown';

describe('Markdown', () => {
  function render(content: string): HTMLElement {
    const fixture = TestBed.createComponent(Markdown);
    fixture.componentRef.setInput('content', content);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders Markdown', () => {
    const element = render('# Titre\n\n**gras**');
    expect(element.querySelector('h1')?.textContent).toBe('Titre');
    expect(element.querySelector('strong')?.textContent).toBe('gras');
  });

  it('strips scripts and event handlers', () => {
    const element = render('<script>alert(1)</script><img src="x" onerror="alert(1)">');
    expect(element.querySelector('script')).toBeNull();
    expect(element.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });
});

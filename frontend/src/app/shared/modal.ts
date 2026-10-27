import { Directive, ElementRef, inject } from '@angular/core';

/**
 * A native modal <dialog> (opened with showModal()) that also closes on a click outside: closedby="any",
 * and the same by pointer position where closedby is not supported (Safari).
 */
@Directive({
  selector: 'dialog[appModal]',
  host: {
    closedby: 'any',
    '(pointerdown)': 'pressedOutside = outside($event)',
    '(pointerup)': 'onPointerUp($event)',
  },
})
export class Modal {
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private readonly native = 'closedBy' in HTMLDialogElement.prototype;
  protected pressedOutside = false;

  open(): void {
    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  close(): void {
    this.dialog.close();
  }

  /** The pointer, not event.target: the dialog is also the target of its own padding */
  protected outside(event: PointerEvent): boolean {
    const r = this.dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  }

  protected onPointerUp(event: PointerEvent): void {
    // Pressed and released outside: a text selection ending on the backdrop does not close it
    if (!this.native && this.pressedOutside && this.outside(event)) {
      this.dialog.close();
    }
  }
}

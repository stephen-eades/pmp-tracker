import { Directive, ElementRef, afterEveryRender, Component, computed, input, output } from '@angular/core';

/**
 * Answer-sheet bubble. Two steps (empty, filled) for checkboxes,
 * three (empty, half, filled) for Not started / In progress / Done. Click to advance.
 */
@Component({
  selector: 'app-bubble',
  template: `<button
    type="button"
    class="bubble"
    [class.half]="filled() === 'half'"
    [class.full]="filled() === 'full'"
    [attr.aria-label]="label()"
    [attr.aria-pressed]="steps() === 2 ? step() === 1 : null"
    [title]="label()"
    (click)="pressed.emit()"
  ></button>`,
})
export class Bubble {
  readonly step = input.required<number>();
  readonly steps = input(2);
  readonly label = input('');
  /** The parent advances its own value, so fast repeat clicks never act on a stale render. */
  readonly pressed = output<void>();
  protected readonly filled = computed(() => {
    const last = this.steps() - 1;
    if (this.step() >= last) return 'full';
    return this.step() > 0 ? 'half' : 'empty';
  });
}

/** Grows a textarea to fit its text (for browsers without CSS field-sizing). */
@Directive({
  selector: 'textarea[autoGrow]',
  host: { '(input)': 'fit()' },
})
export class AutoGrow {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {
    afterEveryRender(() => this.fit());
  }
  fit(): void {
    const t = this.el.nativeElement;
    if (CSS.supports?.('field-sizing', 'content')) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  }
}

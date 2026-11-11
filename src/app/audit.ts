import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { Bubble, AutoGrow } from './shared';
import { Check, newId } from './plan.model';

@Component({
  selector: 'app-audit',
  imports: [FormsModule, Bubble, AutoGrow],
  template: `
    @if (store.plan(); as p) {
      <textarea class="cell lead-text" autoGrow rows="1" [ngModel]="p.audit.intro" (ngModelChange)="p.audit.intro = $event; store.touch()" aria-label="Audit introduction"></textarea>
      <ul class="checks">
        @for (c of p.audit.items; track c.id) {
          <li [class.done]="c.done">
            <app-bubble [step]="c.done ? 1 : 0" [label]="(c.text || 'Item') + (c.done ? ': ready' : ': not ready')" (pressed)="c.done = !c.done; store.touch()" />
            <textarea class="cell" autoGrow rows="1" [ngModel]="c.text" (ngModelChange)="c.text = $event; store.touch()" aria-label="Checklist item"></textarea>
            <button type="button" class="remove" (click)="remove(c)" aria-label="Remove item">Remove</button>
          </li>
        }
      </ul>
      <button type="button" class="add" (click)="add()">Add item</button>
    }
  `,
})
export class Audit {
  protected readonly store = inject(PlanStore);

  protected add(): void {
    this.store.plan()?.audit.items.push({ id: newId(), text: '', done: false });
    this.store.touch();
  }

  protected remove(c: Check): void {
    const p = this.store.plan();
    if (!p) return;
    if (c.text.trim() && !confirm('Remove this item?')) return;
    p.audit.items = p.audit.items.filter((x) => x !== c);
    this.store.touch();
  }
}

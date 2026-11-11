import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { Bubble, AutoGrow } from './shared';
import { STATUSES, Week, addDays, newId, todayIso } from './plan.model';

@Component({
  selector: 'app-weeks',
  imports: [FormsModule, Bubble, AutoGrow],
  template: `
    @if (store.plan(); as p) {
      <div class="scroll">
        <table class="grid-table weeks">
          <thead>
            <tr>
              <th class="c-status">Status</th>
              <th class="c-date">Week of</th>
              <th class="c-num">Hours</th>
              <th class="c-num">Course hours done</th>
              <th>Tasks</th>
              <th><span class="sr">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            @for (w of p.weeks; track w.id) {
              <tr [class.current]="w.id === currentId()" [class.done]="w.status === 'Done'">
                <td class="c-status">
                  <div class="status">
                    <app-bubble
                      [steps]="3"
                      [step]="stepOf(w)"
                      [label]="'Week of ' + w.weekOf + ': ' + w.status + '. Click to change.'"
                      (pressed)="advance(w)"
                    />
                    <span class="status-word">{{ w.status }}</span>
                  </div>
                  @if (w.id === currentId()) {
                    <span class="this-week">This week</span>
                  }
                </td>
                <td class="c-date"><input class="cell" type="date" [ngModel]="w.weekOf" (ngModelChange)="w.weekOf = $event; store.touch()" aria-label="Week of" /></td>
                <td class="c-num"><input class="cell" [ngModel]="w.hours" (ngModelChange)="w.hours = $event; store.touch()" aria-label="Hours" /></td>
                <td class="c-num"><input class="cell" [ngModel]="w.courseHours" (ngModelChange)="w.courseHours = $event; store.touch()" aria-label="Course hours done" /></td>
                <td><textarea class="cell" autoGrow rows="1" [ngModel]="w.tasks" (ngModelChange)="w.tasks = $event; store.touch()" aria-label="Tasks"></textarea></td>
                <td><button type="button" class="remove" (click)="remove(w)" [attr.aria-label]="'Remove week of ' + w.weekOf">Remove</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button type="button" class="add" (click)="add()">Add week</button>
      <textarea class="cell note" autoGrow rows="1" [ngModel]="p.weeksNote" (ngModelChange)="p.weeksNote = $event; store.touch()" aria-label="Note under the weekly plan"></textarea>
    }
  `,
})
export class Weeks {
  protected readonly store = inject(PlanStore);

  /** The week that contains today, if any. */
  protected readonly currentId = computed(() => {
    const today = todayIso();
    const w = this.store.plan()?.weeks.findLast((x) => x.weekOf <= today && today < addDays(x.weekOf, 7));
    return w?.id ?? null;
  });

  protected stepOf(w: Week): number {
    return Math.max(0, STATUSES.indexOf(w.status));
  }

  protected advance(w: Week): void {
    w.status = STATUSES.at((this.stepOf(w) + 1) % STATUSES.length) ?? 'Not started';
    this.store.touch();
  }

  protected add(): void {
    const p = this.store.plan();
    if (!p) return;
    const last = p.weeks.at(-1);
    const weekOf = last?.weekOf ? addDays(last.weekOf, 7) : todayIso();
    p.weeks.push({ id: newId(), weekOf, hours: '', courseHours: '', tasks: '', status: 'Not started' });
    this.store.touch();
  }

  protected remove(w: Week): void {
    const p = this.store.plan();
    if (!p) return;
    if (w.tasks.trim() && !confirm(`Remove the week of ${w.weekOf}?`)) return;
    p.weeks = p.weeks.filter((x) => x !== w);
    this.store.touch();
  }
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { Bubble, AutoGrow } from './shared';
import { Deadline, Note, daysBetween, newId, todayIso, addDays } from './plan.model';

@Component({
  selector: 'app-deadlines',
  imports: [FormsModule, Bubble, AutoGrow],
  template: `
    @if (store.plan(); as p) {
      <div class="scroll">
        <table class="grid-table deadlines">
          <thead>
            <tr>
              <th class="c-status">Met</th>
              <th>Milestone</th>
              <th class="c-date">Target</th>
              <th class="c-date">Latest safe</th>
              <th class="c-when">Where it stands</th>
              <th>Why it matters</th>
              <th><span class="sr">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            @for (d of p.deadlines; track d.id) {
              <tr [class.done]="d.done">
                <td class="c-status">
                  <app-bubble [step]="d.done ? 1 : 0" [label]="d.milestone + (d.done ? ': met' : ': not met yet')" (pressed)="d.done = !d.done; store.touch()" />
                </td>
                <td><textarea class="cell strong" autoGrow rows="1" [ngModel]="d.milestone" (ngModelChange)="d.milestone = $event; store.touch()" aria-label="Milestone"></textarea></td>
                <td class="c-date"><input class="cell" type="date" [ngModel]="d.target" (ngModelChange)="d.target = $event; store.touch()" aria-label="Target date" /></td>
                <td class="c-date"><input class="cell" type="date" [ngModel]="d.latestSafe" (ngModelChange)="d.latestSafe = $event; store.touch()" aria-label="Latest safe date" /></td>
                <td class="c-when"><span class="when" [attr.data-tone]="standing(d).tone">{{ standing(d).text }}</span></td>
                <td><textarea class="cell" autoGrow rows="1" [ngModel]="d.why" (ngModelChange)="d.why = $event; store.touch()" aria-label="Why it matters"></textarea></td>
                <td><button type="button" class="remove" (click)="remove(d)" [attr.aria-label]="'Remove ' + d.milestone">Remove</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button type="button" class="add" (click)="add()">Add milestone</button>

      <ul class="notes">
        @for (n of p.deadlineNotes; track n.id) {
          <li>
            <textarea class="cell" autoGrow rows="1" [ngModel]="n.text" (ngModelChange)="n.text = $event; store.touch()" aria-label="Note"></textarea>
            <button type="button" class="remove" (click)="removeNote(n)" aria-label="Remove note">Remove</button>
          </li>
        }
      </ul>
      <button type="button" class="add" (click)="addNote()">Add note</button>
    }
  `,
})
export class Deadlines {
  protected readonly store = inject(PlanStore);

  protected standing(d: Deadline): { text: string; tone: string } {
    if (d.done) return { text: 'Met', tone: 'good' };
    if (!d.target) return { text: 'No date set', tone: 'quiet' };
    const today = todayIso();
    const toTarget = daysBetween(today, d.target);
    const toSafe = d.latestSafe ? daysBetween(today, d.latestSafe) : toTarget;
    if (toSafe < 0) return { text: `${-toSafe} ${plural(-toSafe)} past latest safe`, tone: 'critical' };
    if (toTarget < 0) return { text: `Past target, ${toSafe} ${plural(toSafe)} of slack left`, tone: 'warning' };
    if (toTarget === 0) return { text: 'Due today', tone: 'warning' };
    return { text: `${toTarget} ${plural(toTarget)} to target`, tone: toTarget <= 7 ? 'warning' : 'quiet' };
  }

  protected add(): void {
    const p = this.store.plan();
    if (!p) return;
    const target = addDays(todayIso(), 14);
    p.deadlines.push({ id: newId(), milestone: 'New milestone', target, latestSafe: addDays(target, 7), why: '', done: false });
    this.store.touch();
  }

  protected remove(d: Deadline): void {
    const p = this.store.plan();
    if (!p || !confirm(`Remove "${d.milestone}"?`)) return;
    p.deadlines = p.deadlines.filter((x) => x !== d);
    this.store.touch();
  }

  protected addNote(): void {
    this.store.plan()?.deadlineNotes.push({ id: newId(), text: '' });
    this.store.touch();
  }

  protected removeNote(n: Note): void {
    const p = this.store.plan();
    if (!p) return;
    if (n.text.trim() && !confirm('Remove this note?')) return;
    p.deadlineNotes = p.deadlineNotes.filter((x) => x !== n);
    this.store.touch();
  }
}

function plural(n: number): string {
  return n === 1 ? 'day' : 'days';
}

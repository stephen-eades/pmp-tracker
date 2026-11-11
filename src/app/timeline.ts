import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { Phase, newId, shortDate, todayIso, monthName, addDays } from './plan.model';

const LEFT = 196;
const RIGHT = 628; // leaves room for date labels on the right
const TOP = 52;
const ROW = 30;

@Component({
  selector: 'app-timeline',
  imports: [FormsModule],
  template: `
    @if (chart(); as c) {
      <svg class="timeline" [attr.viewBox]="'0 0 760 ' + c.height" role="img" aria-label="Plan timeline">
        @for (t of c.ticks; track t.x) {
          <line [attr.x1]="t.x" [attr.x2]="t.x" [attr.y1]="TOP - 12" [attr.y2]="c.height - 10" class="grid" />
          <text [attr.x]="t.x + 4" [attr.y]="TOP - 20" class="tick">{{ t.label }}</text>
        }
        @if (c.todayX !== null) {
          <line [attr.x1]="c.todayX" [attr.x2]="c.todayX" [attr.y1]="TOP - 12" [attr.y2]="c.height - 16" class="today" />
          <text [attr.x]="c.todayX" [attr.y]="c.height - 2" text-anchor="middle" class="today-label">Today</text>
        }
        @for (r of c.rows; track r.id) {
          <g [class.hot]="r.highlight">
            <text x="0" [attr.y]="r.y + 4" class="name">{{ r.name }}</text>
            @if (r.single) {
              <path [attr.d]="'M' + r.x1 + ' ' + (r.y - 7) + 'l7 7l-7 7l-7 -7z'" class="mark" />
            } @else {
              <rect [attr.x]="r.x1" [attr.y]="r.y - 6" [attr.width]="r.w" height="12" rx="6" class="bar" />
            }
            <text [attr.x]="r.labelX" [attr.y]="r.y + 4" class="dates" [attr.text-anchor]="r.labelEnd ? 'end' : 'start'">{{ r.dates }}</text>
          </g>
        }
      </svg>
    } @else {
      <p class="empty">Add a phase with a start and end date to draw the timeline.</p>
    }

    <button type="button" class="link" (click)="editing.set(!editing())" [attr.aria-expanded]="editing()">
      {{ editing() ? 'Done editing timeline' : 'Edit timeline' }}
    </button>

    @if (editing() && store.plan(); as p) {
      <div class="scroll">
        <table class="grid-table compact">
          <thead>
            <tr><th>Phase</th><th>Start</th><th>End</th><th>Highlight</th><th><span class="sr">Remove</span></th></tr>
          </thead>
          <tbody>
            @for (ph of p.phases; track ph.id) {
              <tr>
                <td><input class="cell" [ngModel]="ph.name" (ngModelChange)="ph.name = $event; store.touch()" aria-label="Phase name" /></td>
                <td><input class="cell" type="date" [ngModel]="ph.start" (ngModelChange)="ph.start = $event; store.touch()" aria-label="Start date" /></td>
                <td><input class="cell" type="date" [ngModel]="ph.end" (ngModelChange)="ph.end = $event; store.touch()" aria-label="End date" /></td>
                <td><input type="checkbox" [ngModel]="ph.highlight" (ngModelChange)="ph.highlight = $event; store.touch()" aria-label="Highlight this phase" /></td>
                <td><button type="button" class="remove" (click)="remove(ph)" [attr.aria-label]="'Remove ' + ph.name">Remove</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button type="button" class="add" (click)="add()">Add phase</button>
    }
  `,
})
export class Timeline {
  protected readonly store = inject(PlanStore);
  protected readonly editing = signal(false);
  protected readonly TOP = TOP;

  protected readonly chart = computed(() => {
    const phases = (this.store.plan()?.phases ?? []).filter((p) => isDate(p.start));
    if (!phases.length) return null;
    const ends = phases.map((p) => (isDate(p.end) && p.end >= p.start ? p.end : p.start));
    const t = (d: string) => Date.parse(d) / 86_400_000;
    const lo = Math.min(...phases.map((p) => t(p.start)));
    const hi = Math.max(lo + 1, ...ends.map(t));
    const x = (d: string) => LEFT + ((t(d) - lo) / (hi - lo)) * (RIGHT - LEFT);

    const ticks: { x: number; label: string }[] = [];
    const first = new Date(lo * 86_400_000);
    for (let i = 1; ; i++) {
      const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1));
      if (t(d.toISOString().slice(0, 10)) > hi) break;
      ticks.push({ x: x(d.toISOString().slice(0, 10)), label: monthName(d.getUTCMonth()) });
    }

    const rows = phases.map((p, i) => {
      const end = ends[i];
      const x1 = x(p.start);
      const x2 = x(end);
      const single = p.start === end;
      const dates = single ? shortDate(p.start) : `${shortDate(p.start)} to ${shortDate(end)}`;
      const labelEnd = x2 + 12 + dates.length * 6.4 > 752;
      return {
        id: p.id,
        name: p.name,
        highlight: p.highlight,
        y: TOP + 8 + i * ROW,
        x1,
        w: Math.max(x2 - x1, 6),
        single,
        dates,
        labelEnd,
        labelX: labelEnd ? x1 - 12 : (single ? x1 : x2) + 12,
      };
    });

    const today = todayIso();
    const todayX = t(today) >= lo && t(today) <= hi ? x(today) : null;
    return { ticks, rows, todayX, height: TOP + 8 + phases.length * ROW + 20 };
  });

  protected add(): void {
    const p = this.store.plan();
    if (!p) return;
    const last = p.phases.at(-1);
    const start = last && isDate(last.end) ? addDays(last.end, 1) : todayIso();
    p.phases.push({ id: newId(), name: 'New phase', start, end: addDays(start, 13), highlight: false });
    this.store.touch();
  }

  protected remove(ph: Phase): void {
    const p = this.store.plan();
    if (!p || !confirm(`Remove "${ph.name}" from the timeline?`)) return;
    p.phases = p.phases.filter((x) => x !== ph);
    this.store.touch();
  }
}

function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

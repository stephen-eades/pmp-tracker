import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { AutoGrow } from './shared';
import { Timeline } from './timeline';
import { Weeks } from './weeks';
import { Deadlines } from './deadlines';
import { Worksheet } from './worksheet';
import { Audit } from './audit';
import { daysBetween, experienceMonths, shortDate, todayIso } from './plan.model';

@Component({
  selector: 'app-root',
  imports: [FormsModule, AutoGrow, Timeline, Weeks, Deadlines, Worksheet, Audit],
  template: `
    @if (store.state() === 'error') {
      <div class="banner" role="alert">{{ store.error() }}</div>
    }

    @if (store.plan(); as p) {
      <header class="sheet-head">
        <div class="head-row">
          <input class="cell title" [ngModel]="p.title" (ngModelChange)="p.title = $event; store.touch()" aria-label="Plan title" />
          <div class="head-actions">
            <span class="save" [attr.data-state]="store.state()" aria-live="polite">{{ saveText() }}</span>
            <button type="button" class="ghost" (click)="print()">Print</button>
          </div>
        </div>
        <textarea class="cell lead-text" autoGrow rows="1" [ngModel]="p.lead" (ngModelChange)="p.lead = $event; store.touch()" aria-label="Plan summary"></textarea>

        <dl class="strip">
          <div class="strip-cell exam">
            <dt>Exam window</dt>
            <dd class="big">{{ examText() }}</dd>
            <dd class="dates">
              <input class="cell" type="date" [ngModel]="p.exam.start" (ngModelChange)="p.exam.start = $event; store.touch()" aria-label="Exam window start" />
              <span>to</span>
              <input class="cell" type="date" [ngModel]="p.exam.end" (ngModelChange)="p.exam.end = $event; store.touch()" aria-label="Exam window end" />
            </dd>
          </div>
          <div class="strip-cell">
            <dt>Weeks done</dt>
            <dd class="big">{{ weeksDone().done }}<span class="of">/{{ weeksDone().total }}</span></dd>
          </div>
          <div class="strip-cell">
            <dt>Experience mapped</dt>
            <dd class="big">{{ monthsMapped() }}<span class="of">/36 months</span></dd>
          </div>
          <div class="strip-cell">
            <dt>Audit kit ready</dt>
            <dd class="big">{{ auditReady().done }}<span class="of">/{{ auditReady().total }}</span></dd>
          </div>
        </dl>
      </header>

      <main>
        <section aria-labelledby="h-glance">
          <h2 id="h-glance">At a glance</h2>
          <app-timeline />
        </section>
        <section aria-labelledby="h-weeks">
          <h2 id="h-weeks">Week by week</h2>
          <p class="hint">Click a bubble to move a week from not started, to in progress, to done.</p>
          <app-weeks />
        </section>
        <section aria-labelledby="h-deadlines">
          <h2 id="h-deadlines">Deadlines</h2>
          <app-deadlines />
        </section>
        <section aria-labelledby="h-worksheet">
          <h2 id="h-worksheet">Application worksheet</h2>
          <app-worksheet />
        </section>
        <section aria-labelledby="h-audit">
          <h2 id="h-audit">Audit kit</h2>
          <app-audit />
        </section>
      </main>

      <footer>Everything you change saves to data/plan.json in the project folder. The previous version is kept in data/plan.backup.json.</footer>
    } @else if (store.state() === 'loading') {
      <p class="loading">Loading your plan…</p>
    }
  `,
})
export class App implements OnInit {
  protected readonly store = inject(PlanStore);

  ngOnInit(): void {
    this.store.load();
  }

  protected readonly examText = computed(() => {
    const p = this.store.plan();
    if (!p?.exam.start) return 'Set a date';
    const today = todayIso();
    const days = daysBetween(today, p.exam.start);
    if (days > 1) return `${days} days out`;
    if (days === 1) return 'Tomorrow';
    if (days === 0 || (p.exam.end && today <= p.exam.end)) return 'This week';
    return `${shortDate(p.exam.start)} has passed`;
  });

  protected readonly weeksDone = computed(() => {
    const weeks = this.store.plan()?.weeks ?? [];
    return { done: weeks.filter((w) => w.status === 'Done').length, total: weeks.length };
  });

  protected readonly monthsMapped = computed(
    () => experienceMonths(this.store.plan()?.worksheet.projects ?? []).unique,
  );

  protected readonly auditReady = computed(() => {
    const items = this.store.plan()?.audit.items ?? [];
    return { done: items.filter((i) => i.done).length, total: items.length };
  });

  protected readonly saveText = computed(() => {
    switch (this.store.state()) {
      case 'loading':
        return 'Loading';
      case 'pending':
      case 'saving':
        return 'Saving';
      case 'error':
        return 'Not saved';
      default: {
        const at = this.store.savedAt();
        if (!at) return 'Saved';
        const t = new Date(at);
        const sameDay = t.toDateString() === new Date().toDateString();
        return sameDay
          ? `Saved ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : `Saved ${t.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      }
    }
  });

  protected print(): void {
    window.print();
  }
}

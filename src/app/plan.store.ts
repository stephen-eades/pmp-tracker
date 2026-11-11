import { Injectable, signal } from '@angular/core';
import { Plan } from './plan.model';

export type SaveState = 'loading' | 'saved' | 'pending' | 'saving' | 'error';

/**
 * Holds the plan and writes it back to data/plan.json through the local server.
 * Components edit the plan objects in place, then call touch(); saves are debounced.
 */
@Injectable({ providedIn: 'root' })
export class PlanStore {
  readonly plan = signal<Plan | null>(null);
  readonly state = signal<SaveState>('loading');
  readonly error = signal('');
  readonly savedAt = signal<string | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private dirtyWhileSaving = false;

  constructor() {
    window.addEventListener('beforeunload', (e) => {
      if (this.state() === 'pending' || this.state() === 'saving') {
        this.flush(true);
        e.preventDefault();
      }
    });
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const res = await fetch('/api/plan', { cache: 'no-store' });
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      const plan = (await res.json()) as Plan;
      this.plan.set(plan);
      this.savedAt.set(plan.savedAt ?? null);
      this.state.set('saved');
    } catch (err) {
      this.fail(err, 'Could not load the plan. Is the server running? Start it with `npm start`.');
    }
  }

  /** Call after any edit: refreshes derived values and schedules a save. */
  touch(): void {
    const p = this.plan();
    if (!p) return;
    this.plan.set({ ...p });
    this.state.set('pending');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 600);
  }

  async flush(unloading = false): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const p = this.plan();
    if (!p) return;
    if (this.inFlight && !unloading) {
      this.dirtyWhileSaving = true;
      return;
    }
    this.inFlight = true;
    this.state.set('saving');
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
        keepalive: unloading,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `The server answered ${res.status}.`);
      this.savedAt.set(body.savedAt ?? new Date().toISOString());
      this.state.set('saved');
      this.error.set('');
    } catch (err) {
      this.fail(err, 'Changes are not saved. Check that the server is still running, then edit anything to retry.');
    } finally {
      this.inFlight = false;
      if (this.dirtyWhileSaving) {
        this.dirtyWhileSaving = false;
        this.flush();
      }
    }
  }

  private fail(err: unknown, message: string): void {
    console.error(err);
    this.error.set(message);
    this.state.set('error');
  }
}

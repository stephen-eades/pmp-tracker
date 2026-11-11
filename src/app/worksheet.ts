import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStore } from './plan.store';
import { Bubble, AutoGrow } from './shared';
import { Note, Project, TemplatePart, experienceMonths, newId, projectMonths, wordCount } from './plan.model';

@Component({
  selector: 'app-worksheet',
  imports: [FormsModule, Bubble, AutoGrow],
  template: `
    @if (store.plan(); as p) {
      <textarea class="cell lead-text" autoGrow rows="1" [ngModel]="p.worksheet.intro" (ngModelChange)="p.worksheet.intro = $event; store.touch()" aria-label="Worksheet introduction"></textarea>

      <ul class="notes">
        @for (r of p.worksheet.rules; track r.id) {
          <li>
            <textarea class="cell" autoGrow rows="1" [ngModel]="r.text" (ngModelChange)="r.text = $event; store.touch()" aria-label="Rule"></textarea>
            <button type="button" class="remove" (click)="removeRule(r)" aria-label="Remove rule">Remove</button>
          </li>
        }
      </ul>
      <button type="button" class="add" (click)="addRule()">Add rule</button>

      <div class="months" role="group" aria-label="Experience months mapped">
        <div class="months-head">
          <strong>{{ months().unique }} of 36 months mapped</strong>
          <span class="quiet">
            Unique months since {{ months().windowStartLabel }}.
            @if (months().overlap > 0) {
              {{ months().overlap }} overlapping {{ months().overlap === 1 ? 'month' : 'months' }} counted once.
            }
          </span>
        </div>
        <div class="month-grid" aria-hidden="true">
          @for (i of slots; track i) {
            <span [class.on]="i < months().unique"></span>
          }
        </div>
      </div>

      <div class="scroll">
        <table class="grid-table projects">
          <thead>
            <tr>
              <th class="c-org">Organization</th>
              <th class="c-job">Job title</th>
              <th class="c-month">Start</th>
              <th class="c-month">End</th>
              <th class="c-num">Months</th>
              <th class="c-verifier">Verifier (name, title, contact)</th>
              <th class="c-status">Verifier confirmed</th>
              <th class="c-status">Summary drafted</th>
              <th><span class="sr">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            @for (pr of p.worksheet.projects; track pr.id) {
              <tr>
                <td><textarea class="cell" autoGrow rows="1" [ngModel]="pr.organization" (ngModelChange)="pr.organization = $event; store.touch()" placeholder="Organization" aria-label="Organization"></textarea></td>
                <td><textarea class="cell" autoGrow rows="1" [ngModel]="pr.jobTitle" (ngModelChange)="pr.jobTitle = $event; store.touch()" placeholder="Your title then" aria-label="Job title"></textarea></td>
                <td class="c-month"><input class="cell" type="month" placeholder="YYYY-MM" [ngModel]="pr.start" (ngModelChange)="pr.start = $event; store.touch()" aria-label="Start month" /></td>
                <td class="c-month"><input class="cell" type="month" placeholder="YYYY-MM" [ngModel]="pr.end" (ngModelChange)="pr.end = $event; store.touch()" aria-label="End month" /></td>
                <td class="c-num">
                  @if (monthsOf(pr); as m) {
                    {{ m }}
                  } @else if (pr.start && pr.end) {
                    <span class="when" data-tone="critical">End is before start</span>
                  } @else {
                    <span class="quiet">&ndash;</span>
                  }
                </td>
                <td><textarea class="cell" autoGrow rows="1" [ngModel]="pr.verifier" (ngModelChange)="pr.verifier = $event; store.touch()" placeholder="Name, title, email or phone" aria-label="Verifier"></textarea></td>
                <td class="c-status">
                  <app-bubble [step]="pr.verifierConfirmed ? 1 : 0" label="Verifier confirmed" (pressed)="pr.verifierConfirmed = !pr.verifierConfirmed; store.touch()" />
                </td>
                <td class="c-status">
                  <app-bubble [step]="pr.summaryDrafted ? 1 : 0" label="Summary drafted" (pressed)="pr.summaryDrafted = !pr.summaryDrafted; store.touch()" />
                </td>
                <td><button type="button" class="remove" (click)="remove(pr)" aria-label="Remove project">Remove</button></td>
              </tr>
              <tr class="detail">
                <td colspan="9">
                  <button type="button" class="link" (click)="toggle(pr)" [attr.aria-expanded]="open().has(pr.id)">
                    {{ open().has(pr.id) ? 'Hide role summary' : 'Write role summary' }}
                  </button>
                  <span class="count" [attr.data-tone]="countTone(pr)">{{ words(pr) }} words</span>
                  @if (open().has(pr.id)) {
                    <textarea class="cell summary" autoGrow rows="6" placeholder="Role, contributions, outcomes. 100 to 500 words." [ngModel]="pr.summary" (ngModelChange)="pr.summary = $event; store.touch()" aria-label="Role summary"></textarea>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button type="button" class="add" (click)="add()">Add project</button>

      <h3>Role summary template</h3>
      <textarea class="cell" autoGrow rows="1" [ngModel]="p.template.intro" (ngModelChange)="p.template.intro = $event; store.touch()" aria-label="Template introduction"></textarea>
      <ol class="parts">
        @for (t of p.template.parts; track t.id) {
          <li>
            <div class="part-head">
              <input class="cell strong" [ngModel]="t.title" (ngModelChange)="t.title = $event; store.touch()" aria-label="Part title" />
              <button type="button" class="remove" (click)="removePart(t)" aria-label="Remove part">Remove</button>
            </div>
            <textarea class="cell" autoGrow rows="1" [ngModel]="t.body" (ngModelChange)="t.body = $event; store.touch()" aria-label="Part guidance"></textarea>
          </li>
        }
      </ol>
      <button type="button" class="add" (click)="addPart()">Add part</button>
      <textarea class="cell note" autoGrow rows="1" [ngModel]="p.template.closing" (ngModelChange)="p.template.closing = $event; store.touch()" aria-label="Closing note"></textarea>
    }
  `,
})
export class Worksheet {
  protected readonly store = inject(PlanStore);
  protected readonly open = signal(new Set<string>());
  protected readonly slots = Array.from({ length: 36 }, (_, i) => i);
  protected readonly months = computed(() => experienceMonths(this.store.plan()?.worksheet.projects ?? []));

  protected monthsOf(pr: Project): number | null {
    return projectMonths(pr);
  }

  protected words(pr: Project): number {
    return wordCount(pr.summary);
  }

  /** PMI's form takes 100 to 500 words. */
  protected countTone(pr: Project): string {
    const n = wordCount(pr.summary);
    if (n === 0) return 'quiet';
    return n >= 100 && n <= 500 ? 'good' : 'warning';
  }

  protected toggle(pr: Project): void {
    const next = new Set(this.open());
    if (next.has(pr.id)) next.delete(pr.id);
    else next.add(pr.id);
    this.open.set(next);
  }

  protected add(): void {
    this.store.plan()?.worksheet.projects.push({
      id: newId(), organization: '', jobTitle: '', start: '', end: '', verifier: '',
      verifierConfirmed: false, summaryDrafted: false, summary: '',
    });
    this.store.touch();
  }

  protected remove(pr: Project): void {
    const p = this.store.plan();
    if (!p) return;
    const hasContent = pr.organization || pr.jobTitle || pr.summary || pr.verifier;
    if (hasContent && !confirm(`Remove ${pr.organization || 'this project'}?`)) return;
    p.worksheet.projects = p.worksheet.projects.filter((x) => x !== pr);
    this.store.touch();
  }

  protected addRule(): void {
    this.store.plan()?.worksheet.rules.push({ id: newId(), text: '' });
    this.store.touch();
  }

  protected removeRule(r: Note): void {
    const p = this.store.plan();
    if (!p) return;
    if (r.text.trim() && !confirm('Remove this rule?')) return;
    p.worksheet.rules = p.worksheet.rules.filter((x) => x !== r);
    this.store.touch();
  }

  protected addPart(): void {
    this.store.plan()?.template.parts.push({ id: newId(), title: 'New part', body: '' });
    this.store.touch();
  }

  protected removePart(t: TemplatePart): void {
    const p = this.store.plan();
    if (!p || !confirm(`Remove "${t.title}"?`)) return;
    p.template.parts = p.template.parts.filter((x) => x !== t);
    this.store.touch();
  }
}

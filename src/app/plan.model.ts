export type Status = 'Not started' | 'In progress' | 'Done';
export const STATUSES: Status[] = ['Not started', 'In progress', 'Done'];

export interface Phase {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (same as start for a single-day milestone)
  highlight: boolean;
}

export interface Week {
  id: string;
  weekOf: string; // YYYY-MM-DD
  hours: string;
  courseHours: string;
  tasks: string;
  status: Status;
}

export interface Deadline {
  id: string;
  milestone: string;
  target: string; // YYYY-MM-DD
  latestSafe: string; // YYYY-MM-DD
  why: string;
  done: boolean;
}

export interface Note {
  id: string;
  text: string;
}

export interface Project {
  id: string;
  organization: string;
  jobTitle: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM
  verifier: string;
  verifierConfirmed: boolean;
  summaryDrafted: boolean;
  summary: string;
}

export interface TemplatePart {
  id: string;
  title: string;
  body: string;
}

export interface Check {
  id: string;
  text: string;
  done: boolean;
}

export interface Plan {
  version: 1;
  title: string;
  lead: string;
  exam: { start: string; end: string };
  phases: Phase[];
  weeks: Week[];
  weeksNote: string;
  deadlines: Deadline[];
  deadlineNotes: Note[];
  worksheet: { intro: string; rules: Note[]; projects: Project[] };
  template: { intro: string; parts: TemplatePart[]; closing: string };
  audit: { intro: string; items: Check[] };
  savedAt?: string;
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
}

/** Days between two YYYY-MM-DD dates (b - a), computed in UTC so time zones never shift the count. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-12-11" -> "Dec 11" */
export function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  return `${MONTHS.at(Number(iso.slice(5, 7)) - 1)} ${Number(iso.slice(8))}`;
}

export function monthName(m: number): string {
  return MONTHS.at(m) ?? '';
}

/** "2024-03" -> month index (year * 12 + month0), or null when not a valid month. */
export function monthIndex(ym: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec((ym || '').trim());
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return Number(m[1]) * 12 + (month - 1);
}

/** Months a single project covers, inclusive; null when its dates are incomplete or reversed. */
export function projectMonths(p: Project): number | null {
  const a = monthIndex(p.start);
  const b = monthIndex(p.end);
  if (a === null || b === null || b < a) return null;
  return b - a + 1;
}

/**
 * Unique months across all projects inside PMI's 10-year window (ending this month).
 * Overlapping months count once, as PMI counts them.
 */
export function experienceMonths(projects: Project[], today = todayIso()) {
  const now = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1;
  const windowStart = now - 119;
  const months = new Set<number>();
  let raw = 0;
  for (const p of projects) {
    const a = monthIndex(p.start);
    const b = monthIndex(p.end);
    if (a === null || b === null || b < a) continue;
    for (let m = a; m <= b; m++) {
      if (m < windowStart || m > now) continue;
      raw++;
      months.add(m);
    }
  }
  return {
    unique: months.size,
    overlap: raw - months.size,
    windowStartLabel: `${monthName(windowStart % 12)} ${Math.floor(windowStart / 12)}`,
  };
}

export function wordCount(text: string): number {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

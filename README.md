# PMP Tracker

A local, single-user tracker for the mid-February 2027 PMP plan. An Angular app plus a
tiny Node server that saves everything you change to `data/plan.json`.

## Run it

Needs Node.js 18 or newer. No install step is needed to run it, because the built app ships in `dist/`.

```bash
npm start
```

Open http://localhost:4300. The server listens on 127.0.0.1 only, so nothing is exposed to your network.
Stop it with Ctrl+C. To use another port: `PORT=5000 npm start`.

## How saving works

- Every edit saves automatically about half a second after you stop typing. The header shows
  "Saved" with the time, or "Not saved" if the server is unreachable.
- Your plan lives in `data/plan.json`. It is plain, readable JSON, so you can back it up,
  diff it, or edit it by hand while the server is stopped.
- Before each save, the previous version is copied to `data/plan.backup.json`.
- Writes go to a temp file first and then replace `plan.json`, so a crash never leaves half a file.
- To start over from the original plan, stop the server and delete `data/plan.json`.
  The next start recreates it from `data/plan.seed.json`.

## Using it

- **Bubbles** work like an answer sheet. On the weekly plan, click to move a week from
  not started (empty) to in progress (half) to done (filled). Elsewhere a bubble is a checkbox.
- **Any text, date or number** is editable in place. Hover to see the field, click to type.
- **Add and remove rows** in every section. Remove appears when you hover a row.
- **Experience mapped** counts unique months across your worksheet projects inside PMI's
  10-year window, with overlapping months counted once, the way PMI counts them.
- **Role summaries** show a live word count against PMI's 100 to 500 word range.
- **Print** gives a clean reference sheet with the editing controls hidden.

## Change the app

Requires Node.js 20.19+, 22.12+ or 24+ for the Angular CLI.

```bash
npm install
npm start          # terminal 1: the file server on :4300
npm run dev        # terminal 2: live-reloading app on http://localhost:4200, proxied to :4300
npm run build      # rebuild dist/ so `npm start` serves your changes
```

| File | What it does |
| --- | --- |
| `server.mjs` | Serves `dist/` and the `GET` / `PUT /api/plan` endpoints. No dependencies. |
| `data/plan.seed.json` | The starting plan, copied to `plan.json` on first run. |
| `src/app/plan.model.ts` | The data shape and the date and month math. |
| `src/app/plan.store.ts` | Loads the plan and debounces saves back to the server. |
| `src/app/*.ts` | One standalone component per section: timeline, weeks, deadlines, worksheet, audit. |
| `src/styles.css` | All styling, including dark mode and print. |

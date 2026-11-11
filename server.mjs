// Local server for the PMP tracker.
// Serves the built Angular app and stores your plan in data/plan.json.
// No dependencies: run with `node server.mjs` (or `npm start`).

import { createServer } from 'node:http';
import { readFile, writeFile, rename, copyFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4300;
const HOST = '127.0.0.1'; // local only; nothing is exposed to your network
const APP_DIR = join(ROOT, 'dist', 'pmp-tracker', 'browser');
const DATA_DIR = join(ROOT, 'data');
const DATA_FILE = join(DATA_DIR, 'plan.json');
const BACKUP_FILE = join(DATA_DIR, 'plan.backup.json');
const SEED_FILE = join(DATA_DIR, 'plan.seed.json');
const MAX_BODY = 5 * 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

async function loadPlan() {
  if (!existsSync(DATA_FILE)) {
    await mkdir(DATA_DIR, { recursive: true });
    await copyFile(SEED_FILE, DATA_FILE);
    console.log('Created data/plan.json from the seed plan.');
  }
  return readFile(DATA_FILE, 'utf8');
}

async function savePlan(body) {
  const plan = JSON.parse(body); // throws on bad JSON
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.weeks)) {
    throw new Error('Plan must be an object with a weeks list.');
  }
  plan.savedAt = new Date().toISOString();
  const text = JSON.stringify(plan, null, 2) + '\n';
  if (existsSync(DATA_FILE)) await copyFile(DATA_FILE, BACKUP_FILE); // one rolling backup
  const tmp = DATA_FILE + '.tmp';
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, DATA_FILE); // atomic swap, so a crash never leaves half a file
  return plan.savedAt;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Plan is larger than 5 MB.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const safe = normalize(urlPath).replace(/^([/\\])+/, '');
  let file = join(APP_DIR, safe);
  if (!file.startsWith(APP_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    if (!(await stat(file)).isFile()) throw new Error('dir');
  } catch {
    file = join(APP_DIR, 'index.html'); // single-page app fallback
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    send(res, 500, 'The app is not built yet. Run `npm run build`, then `npm start`.', 'text/plain');
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api/plan') {
      if (req.method === 'GET') return send(res, 200, await loadPlan());
      if (req.method === 'PUT' || req.method === 'POST') {
        const savedAt = await savePlan(await readBody(req));
        return send(res, 200, JSON.stringify({ savedAt }));
      }
      return send(res, 405, JSON.stringify({ error: 'Use GET or PUT.' }));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
    return serveStatic(req, res);
  } catch (err) {
    return send(res, 400, JSON.stringify({ error: String(err.message || err) }));
  }
});

server.listen(PORT, HOST, () => {
  if (!existsSync(join(APP_DIR, 'index.html'))) {
    console.log('Note: dist/ is missing. Run `npm install` and `npm run build` to build the app.');
  }
  console.log(`PMP tracker running at http://localhost:${PORT}`);
  console.log(`Saving to ${DATA_FILE}`);
});

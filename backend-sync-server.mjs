import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.SYNC_PORT || 8787);
const API_KEY = process.env.NEXUS_SYNC_API_KEY || '';
const STORE_FILE = process.env.NEXUS_SYNC_STORE_FILE || path.join(__dirname, 'backend-data', 'sync-store.json');

async function ensureStoreDir() {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
}

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(data) {
  await ensureStoreDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Nexus-API-Key',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
      if (body.length > 20_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!API_KEY) return true;
  return req.headers['x-nexus-api-key'] === API_KEY;
}

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 204, {});
    }

    if (req.url === '/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, service: 'nexus-sync', ts: new Date().toISOString() });
    }

    if (!isAuthorized(req)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/sync\/([^/]+)$/);

    if (!match) {
      return sendJson(res, 404, { error: 'Not found' });
    }

    const companyId = decodeURIComponent(match[1]);
    const store = await readStore();

    if (req.method === 'GET') {
      return sendJson(res, 200, {
        companyId,
        snapshot: store[companyId] || null,
      });
    }

    if (req.method === 'PUT') {
      const raw = await readBody(req);
      const parsed = raw ? JSON.parse(raw) : {};

      if (!parsed || typeof parsed !== 'object' || !parsed.snapshot) {
        return sendJson(res, 400, { error: 'Invalid payload. Expected { snapshot }.' });
      }

      const incoming = parsed.snapshot;
      const current = store[companyId];

      const incomingTs = new Date(incoming.updatedAt || incoming.exportedAt || 0).getTime();
      const currentTs = new Date(current?.updatedAt || current?.exportedAt || 0).getTime();

      if (!current || incomingTs >= currentTs) {
        store[companyId] = { ...incoming, updatedAt: new Date().toISOString() };
        await writeStore(store);
      }

      return sendJson(res, 200, {
        ok: true,
        companyId,
        updatedAt: store[companyId].updatedAt,
      });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { error: 'Internal error', message: error instanceof Error ? error.message : 'unknown' });
  }
}).listen(PORT, () => {
  console.log(`[nexus-sync] listening on http://0.0.0.0:${PORT}`);
  console.log(`[nexus-sync] store file: ${STORE_FILE}`);
});

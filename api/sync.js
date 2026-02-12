async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const BACKEND_ORIGIN = process.env.NEXUS_SYNC_BACKEND_ORIGIN || 'http://65.108.221.47:8787';
const BACKEND_API_KEY = process.env.NEXUS_SYNC_API_KEY || '';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Nexus-API-Key');
}

function getTargetUrl(req) {
  const incoming = new URL(req.url || '/api/sync', 'http://localhost');

  const pathFromUrl = incoming.pathname.replace(/^\/api\/sync\/?/, '');
  const pathFromQuery = incoming.searchParams.get('proxyPath') || '';
  const forwardPath = (pathFromUrl || pathFromQuery).replace(/^\/+/, '');

  incoming.searchParams.delete('proxyPath');

  const target = new URL(BACKEND_ORIGIN);
  target.pathname = forwardPath ? `/sync/${forwardPath}` : '/sync';
  target.search = incoming.searchParams.toString();

  return target.toString();
}

function getForwardHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  if (BACKEND_API_KEY && !headers['x-nexus-api-key']) {
    headers['x-nexus-api-key'] = BACKEND_API_KEY;
  }

  return headers;
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const targetUrl = getTargetUrl(req);
    const method = (req.method || 'GET').toUpperCase();
    const rawBody = method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(req);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: getForwardHeaders(req),
      body: rawBody && rawBody.length > 0 ? rawBody : undefined,
    });

    const raw = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'content-encoding' || lower === 'transfer-encoding' || lower === 'connection') return;
      res.setHeader(key, value);
    });

    return res.send(raw);
  } catch (error) {
    return res.status(502).json({
      error: 'Bad gateway',
      message: error instanceof Error ? error.message : 'Sync proxy request failed',
    });
  }
}

const BACKEND_BASE_URL = 'http://65.108.221.47';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function getForwardPath(req) {
  const url = new URL(req.url || '/api/proxy', 'http://localhost');

  // Supports /api/proxy/test-db and query fallback /api/proxy?proxyPath=test-db
  const fromPath = url.pathname.replace(/^\/api\/proxy\/?/, '');
  const fromQuery = url.searchParams.get('proxyPath') || '';
  return (fromPath || fromQuery).replace(/^\/+/, '');
}

function getForwardHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  return headers;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const incomingUrl = new URL(req.url || '/api/proxy', 'http://localhost');
    const forwardPath = getForwardPath(req);

    const targetUrl = new URL(BACKEND_BASE_URL);
    targetUrl.pathname = forwardPath ? `/${forwardPath}` : '/';

    // Keep query params except proxyPath helper
    incomingUrl.searchParams.delete('proxyPath');
    targetUrl.search = incomingUrl.searchParams.toString();

    const headers = getForwardHeaders(req);
    const method = req.method || 'GET';
    const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase());

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: hasBody ? req.body : undefined,
    });

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    res.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    return res.send(responseBuffer);
  } catch (error) {
    return res.status(502).json({
      error: 'Bad gateway',
      message: error instanceof Error ? error.message : 'Proxy request failed',
    });
  }
}

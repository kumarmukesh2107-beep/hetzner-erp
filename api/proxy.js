const BACKEND_BASE_URL = 'http://65.108.221.47';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const query = req.query || {};
    const targetPath = typeof query.path === 'string' ? query.path : '';

    const forwardParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) {
        value.forEach((item) => forwardParams.append(key, item));
      } else if (value !== undefined) {
        forwardParams.append(key, String(value));
      }
    }

    const normalizedPath = targetPath.replace(/^\/+/, '');
    const targetUrl = `${BACKEND_BASE_URL}${normalizedPath ? `/${normalizedPath}` : ''}${
      forwardParams.toString() ? `?${forwardParams.toString()}` : ''
    }`;

    const headers = {};

    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const shouldSendBody = !['GET', 'HEAD'].includes(req.method);
    const contentType = typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : '';

    let body;
    if (shouldSendBody) {
      if (contentType.includes('application/json') && typeof req.body !== 'string') {
        body = JSON.stringify(req.body ?? {});
      } else {
        body = req.body;
      }
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseText = await upstreamResponse.text();
    const responseContentType = upstreamResponse.headers.get('content-type') || 'application/json';

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', responseContentType);
    return res.send(responseText);
  } catch (error) {
    return res.status(502).json({
      error: 'Bad gateway',
      message: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
}

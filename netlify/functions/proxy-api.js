exports.handler = async (event) => {
  const backend = (process.env.BACKEND_URL || 'https://api.madison88.com').replace(/\/$/, '');

  // Support both path-based (/:splat) and query-based (?path=) routing
  let apiPath = '';
  if (event.queryStringParameters?.path) {
    apiPath = event.queryStringParameters.path;
  } else if (event.path) {
    const fnPrefix = '/.netlify/functions/proxy-api';
    apiPath = event.path.startsWith(fnPrefix)
      ? event.path.slice(fnPrefix.length + 1)
      : event.path.replace(/^\//, '');
  }

  // Strip /api prefix if present to avoid doubling (/api/api/auth/login)
  if (apiPath.startsWith('api/')) {
    apiPath = apiPath.slice(4);
  }

  const query = new URLSearchParams(event.queryStringParameters || {});
  query.delete('path');
  const isUpload = apiPath.startsWith('uploads/');
  const target = `${backend}${isUpload ? '' : '/api'}/${apiPath}${query.toString() ? `?${query}` : ''}`;

  console.log('[proxy-api]', { method: event.httpMethod, rawPath: event.path, apiPath, target });

  const headers = { ...(event.headers || {}) };
  delete headers.host;
  const init = { method: event.httpMethod, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(event.httpMethod)) init.body = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64') : (event.body || '');
  const response = await fetch(target, init);
  const responseHeaders = Object.fromEntries(response.headers.entries());
  const combinedSetCookie = response.headers.get('set-cookie');
  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];

  // Netlify needs Set-Cookie forwarded explicitly so the browser can retain
  // the HttpOnly auth cookie issued by the VPS backend. Use multiValueHeaders
  // when the runtime exposes multiple Set-Cookie values; keep a fallback for
  // runtimes that only expose a combined header.
  delete responseHeaders['set-cookie'];

  const result = {
    statusCode: response.status,
    headers: responseHeaders,
    body: Buffer.from(await response.arrayBuffer()).toString('base64'),
    isBase64Encoded: true,
  };

  if (setCookies.length > 0) {
    result.multiValueHeaders = { 'set-cookie': setCookies };
  } else if (combinedSetCookie) {
    result.headers['set-cookie'] = combinedSetCookie;
  }

  return result;
};

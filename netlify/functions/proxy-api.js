exports.handler = async (event) => {
  const backend = (process.env.BACKEND_URL || 'http://5.223.78.194:3011').replace(/\/$/, '');

  // Support both path-based (/:splat) and query-based (?path=) routing
  let apiPath = '';
  if (event.queryStringParameters?.path) {
    apiPath = event.queryStringParameters.path;
  } else if (event.path) {
    // event.path = "/proxy-api/auth/login" → strip "/proxy-api" prefix
    const fnPrefix = '/.netlify/functions/proxy-api';
    apiPath = event.path.startsWith(fnPrefix)
      ? event.path.slice(fnPrefix.length + 1)
      : event.path.replace(/^\//, '');
  }

  const query = new URLSearchParams(event.queryStringParameters || {});
  query.delete('path');
  const target = `${backend}/api/${apiPath}${query.toString() ? `?${query}` : ''}`;

  console.log('[proxy-api]', { method: event.httpMethod, rawPath: event.path, apiPath, target });

  const headers = { ...(event.headers || {}) };
  delete headers.host;
  const init = { method: event.httpMethod, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(event.httpMethod)) init.body = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64') : (event.body || '');
  const response = await fetch(target, init);
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: Buffer.from(await response.arrayBuffer()).toString('base64'),
    isBase64Encoded: true,
  };
};

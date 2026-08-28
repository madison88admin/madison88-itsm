exports.handler = async (event) => {
  const backend = (process.env.BACKEND_URL || 'http://5.223.78.194:3001').replace(/\/$/, '');
  const path = event.queryStringParameters?.path || '';
  const query = new URLSearchParams(event.queryStringParameters || {});
  query.delete('path');
  const target = `${backend}/api/${path}${query.toString() ? `?${query}` : ''}`;
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

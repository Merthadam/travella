export class ApiError extends Error {
  constructor(message, status, fields = [], state, code) {
    super(message);
    Object.assign(this, { status, fields, state, code });
  }
}

export async function request(path, body, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      method: options.method || (body === undefined ? 'GET' : 'POST'), credentials: 'same-origin', cache: 'no-store',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Travella-Request': '1' }), ...options.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new ApiError('Unable to connect. Please try again.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message || 'Please try again.', response.status, data.fields, data.state, data.code);
  return data;
}

let refreshing;
export async function readSession() {
  try { return await request('/auth/session'); }
  catch (error) {
    if (error.state !== 'refresh_required') throw error;
    refreshing ||= request('/auth/refresh', {}).finally(() => { refreshing = undefined; });
    await refreshing;
    return request('/auth/session');
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  return headers;
};

const API_URL_HINT =
  'Set GitHub secret VITE_API_URL to your Cloud Run URL (e.g. https://kweka-jeeto-XXXX.asia-south1.run.app) and redeploy the admin.';

async function checkJsonResponse(res: Response, bodyText: string): Promise<void> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html') || bodyText.trimStart().startsWith('<')) {
    throw new Error(`Backend returned HTML instead of JSON. The app may be calling the wrong URL. ${API_URL_HINT}`);
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: getHeaders(),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    await checkJsonResponse(res, text);
    return JSON.parse(text) as T;
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    await checkJsonResponse(res, text);
    return JSON.parse(text) as T;
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    await checkJsonResponse(res, text);
    return JSON.parse(text) as T;
  },

  async getBlob(path: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
};

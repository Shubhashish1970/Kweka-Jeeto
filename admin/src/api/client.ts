const API_BASE = import.meta.env.VITE_API_URL || '';

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  return headers;
};

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
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

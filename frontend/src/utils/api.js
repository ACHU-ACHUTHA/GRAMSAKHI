// Same-origin in dev/preview (Vite proxies /api -> backend) and on Vercel.
// Set VITE_API_URL only when the API runs on a different host.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.error || data.detail || message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return response;
}

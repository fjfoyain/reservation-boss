import { auth } from './firebase';
import { API_URL } from './constants';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  return res.json();
}

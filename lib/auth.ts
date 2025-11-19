import type { User } from '@/models/user';
export async function login(username: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      return { user: null, error: 'Login failed' };
    }

    const payload = (await res.json()) as { user?: User | null; error?: string | null };

    const user = payload.user || null;
    if (!user) {
      return { user: null, error: payload.error || 'Invalid username or password' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return { user, error: null };
  } catch (err) {
    return { user: null, error: 'An error occurred during login' };
  }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}

export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

import type { AuthResponse, User, Game } from '@cohesion/shared';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  register(username: string, displayName: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, password }),
    });
  },

  login(username: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getMe() {
    return request<User>('/auth/me');
  },

  listGames() {
    return request<Game[]>('/games');
  },

  getGame(id: string) {
    return request<Game>(`/games/${id}`);
  },

  createGame() {
    return request<Game>('/games', { method: 'POST' });
  },

  joinGame(id: string) {
    return request<Game>(`/games/${id}/join`, { method: 'POST' });
  },

  makeMove(gameId: string, column: number) {
    return request<Game>(`/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ column }),
    });
  },
};

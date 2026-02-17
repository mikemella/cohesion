import type { Game } from '@cohesion/shared';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  getGame(id: string) {
    return request<Game>(`/games/${id}`);
  },

  createGame(playerName: string) {
    return request<Game>('/games', {
      method: 'POST',
      body: JSON.stringify({ playerName }),
    });
  },

  joinGame(id: string, playerName: string) {
    return request<Game>(`/games/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerName }),
    });
  },

  makeMove(gameId: string, column: number, playerNumber: 1 | 2) {
    return request<Game>(`/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ column, playerNumber }),
    });
  },
};

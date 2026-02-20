import type { Game, GameType } from '@cohesion/shared';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

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

  createGame(playerName: string, gameType: GameType = 'connect-four') {
    return request<Game>('/games', {
      method: 'POST',
      body: JSON.stringify({ playerName, gameType }),
    });
  },

  joinGame(id: string, playerName: string) {
    return request<Game>(`/games/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerName }),
    });
  },

  makeMove(gameId: string, playerNumber: 1 | 2, moveData: Record<string, number>) {
    return request<Game>(`/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ playerNumber, ...moveData }),
    });
  },
};

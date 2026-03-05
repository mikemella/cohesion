import type {
  Game,
  GameType,
  TournamentDetails,
  TournamentParticipant,
  Tournament,
  TournamentFormat,
} from '@cohesion/shared';
import { getSessionId } from './session.js';

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

function withSession(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
      'X-Session-Id': getSessionId(),
    },
  };
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

  placeBattleshipFleet(
    gameId: string,
    playerNumber: 1 | 2,
    ships: import('@cohesion/shared').BattleshipShip[]
  ) {
    return request<Game>(`/games/${gameId}/place`, {
      method: 'POST',
      body: JSON.stringify({ playerNumber, ships }),
    });
  },

  makeWordHuntSubmission(
    gameId: string,
    playerNumber: 1 | 2,
    words: Array<{ word: string; path: number[] }>
  ) {
    return request<Game>(`/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ playerNumber, words }),
    });
  },

  startWordHuntTurn(gameId: string, playerNumber: 1 | 2) {
    return request<Game>(`/games/${gameId}/start-turn`, {
      method: 'POST',
      body: JSON.stringify({ playerNumber }),
    });
  },

  // ---- Tournament API ----

  createTournament(
    hostName: string,
    tournamentName: string,
    gameType: GameType,
    format: TournamentFormat
  ) {
    return request<{ tournament: Tournament; participant: TournamentParticipant }>(
      '/tournaments',
      withSession({
        method: 'POST',
        body: JSON.stringify({ hostName, tournamentName, gameType, format }),
      })
    );
  },

  getTournament(id: string) {
    return request<TournamentDetails>(`/tournaments/${id}`);
  },

  joinTournament(id: string, playerName: string) {
    return request<{ participant: TournamentParticipant; tournament: Tournament }>(
      `/tournaments/${id}/join`,
      withSession({
        method: 'POST',
        body: JSON.stringify({ playerName }),
      })
    );
  },

  launchTournament(id: string) {
    return request<TournamentDetails>(
      `/tournaments/${id}/launch`,
      withSession({ method: 'POST' })
    );
  },

  startMatch(tournamentId: string, matchId: string) {
    return request<{ match: import('@cohesion/shared').TournamentMatch; game: Game }>(
      `/tournaments/${tournamentId}/matches/${matchId}/start`,
      withSession({ method: 'POST' })
    );
  },
};

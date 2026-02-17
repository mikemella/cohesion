import { randomUUID } from 'crypto';
import type { Game, Move, ConnectFourState } from '@cohesion/shared';

// In-memory game storage — no database required
const games = new Map<string, Game>();
const moves = new Map<string, Move[]>(); // gameId -> moves

export function createGame(playerName: string, initialState: ConnectFourState): Game {
  const now = new Date().toISOString();
  const game: Game = {
    id: randomUUID(),
    gameType: 'connect-four',
    status: 'waiting',
    player1Name: playerName,
    player2Name: null,
    currentTurn: 1,
    winner: null,
    isDraw: false,
    state: initialState,
    createdAt: now,
    updatedAt: now,
  };
  games.set(game.id, game);
  moves.set(game.id, []);
  return game;
}

export function getGame(id: string): Game | null {
  return games.get(id) ?? null;
}

export function joinGame(id: string, playerName: string): Game | null {
  const game = games.get(id);
  if (!game || game.status !== 'waiting') return null;

  game.player2Name = playerName;
  game.status = 'active';
  game.updatedAt = new Date().toISOString();
  return game;
}

export function recordMove(
  gameId: string,
  playerNumber: 1 | 2,
  column: number
): Move {
  const gameMoves = moves.get(gameId) ?? [];
  const move: Move = {
    id: randomUUID(),
    gameId,
    playerNumber,
    moveNumber: gameMoves.length + 1,
    moveData: { column },
    createdAt: new Date().toISOString(),
  };
  gameMoves.push(move);
  moves.set(gameId, gameMoves);
  return move;
}

export function updateGame(id: string, updates: Partial<Game>): Game | null {
  const game = games.get(id);
  if (!game) return null;
  Object.assign(game, updates, { updatedAt: new Date().toISOString() });
  return game;
}

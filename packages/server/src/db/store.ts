import { randomUUID } from 'crypto';
import type { Game, Move, GameType, GameState, BattleshipShip } from '@cohesion/shared';

// In-memory game storage — no database required
const games = new Map<string, Game>();
const moves = new Map<string, Move[]>(); // gameId -> moves

// Private Battleship ship placements — never serialized into Game objects
const shipPlacements = new Map<string, { player1: BattleshipShip[] | null; player2: BattleshipShip[] | null }>();

export function initBattleshipPlacements(gameId: string): void {
  shipPlacements.set(gameId, { player1: null, player2: null });
}

export function saveBattleshipPlacement(gameId: string, playerNumber: 1 | 2, ships: BattleshipShip[]): void {
  const existing = shipPlacements.get(gameId) ?? { player1: null, player2: null };
  if (playerNumber === 1) {
    shipPlacements.set(gameId, { ...existing, player1: ships });
  } else {
    shipPlacements.set(gameId, { ...existing, player2: ships });
  }
}

export function getBattleshipPlacements(gameId: string): { player1: BattleshipShip[] | null; player2: BattleshipShip[] | null } | null {
  return shipPlacements.get(gameId) ?? null;
}

export function createGame(playerName: string, gameType: GameType, initialState: GameState): Game {
  const now = new Date().toISOString();
  const game: Game = {
    id: randomUUID(),
    gameType,
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
  if (gameType === 'battleship') {
    initBattleshipPlacements(game.id);
  }
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
  moveData: Record<string, number>
): Move {
  const gameMoves = moves.get(gameId) ?? [];
  const move: Move = {
    id: randomUUID(),
    gameId,
    playerNumber,
    moveNumber: gameMoves.length + 1,
    moveData,
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

// ---- User & Auth ----

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---- Game Types ----

export type GameType = 'connect-four';

export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface Game {
  id: string;
  gameType: GameType;
  status: GameStatus;
  players: GamePlayer[];
  currentTurnUserId: string | null;
  winnerId: string | null;
  isDraw: boolean;
  state: ConnectFourState;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayer {
  userId: string;
  username: string;
  displayName: string;
  playerNumber: 1 | 2;
}

// ---- Connect Four ----

export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLS = 7;

// 0 = empty, 1 = player 1, 2 = player 2
export type CellValue = 0 | 1 | 2;
export type Board = CellValue[][];

export interface ConnectFourState {
  board: Board;
  currentPlayer: 1 | 2;
}

export interface Move {
  id: string;
  gameId: string;
  userId: string;
  moveNumber: number;
  moveData: { column: number };
  createdAt: string;
}

// ---- API Types ----

export interface CreateGameRequest {
  gameType: GameType;
}

export interface MakeMoveRequest {
  column: number;
}

export interface ApiError {
  error: string;
}

// ---- WebSocket Events ----

export interface ServerToClientEvents {
  gameUpdated: (game: Game) => void;
  playerJoined: (data: { gameId: string; player: GamePlayer }) => void;
  moveMade: (data: { gameId: string; move: Move; game: Game }) => void;
  gameOver: (data: { gameId: string; winnerId: string | null; isDraw: boolean }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
}

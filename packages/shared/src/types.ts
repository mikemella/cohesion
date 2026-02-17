// ---- Game Types ----

export type GameType = 'connect-four';

export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface Game {
  id: string;
  gameType: GameType;
  status: GameStatus;
  player1Name: string | null;
  player2Name: string | null;
  currentTurn: 1 | 2;
  winner: 1 | 2 | null;
  isDraw: boolean;
  state: ConnectFourState;
  createdAt: string;
  updatedAt: string;
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
  playerNumber: 1 | 2;
  moveNumber: number;
  moveData: { column: number };
  createdAt: string;
}

// ---- API Types ----

export interface CreateGameRequest {
  playerName: string;
}

export interface JoinGameRequest {
  playerName: string;
}

export interface MakeMoveRequest {
  column: number;
  playerNumber: 1 | 2;
}

export interface ApiError {
  error: string;
}

// ---- WebSocket Events ----

export interface ServerToClientEvents {
  gameUpdated: (game: Game) => void;
  playerJoined: (data: { gameId: string; playerName: string }) => void;
  moveMade: (data: { gameId: string; move: Move; game: Game }) => void;
  gameOver: (data: { gameId: string; winner: 1 | 2 | null; isDraw: boolean }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
}

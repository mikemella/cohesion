// ---- Game Types ----

export type GameType = 'connect-four' | 'tic-tac-toe' | 'dots' | 'battleship' | 'word-hunt';

export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export type GameState = ConnectFourState | TicTacToeState | DotsState | BattleshipState | WordHuntState;

export interface Game {
  id: string;
  gameType: GameType;
  status: GameStatus;
  player1Name: string | null;
  player2Name: string | null;
  currentTurn: 1 | 2;
  winner: 1 | 2 | null;
  isDraw: boolean;
  state: GameState;
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
  moveData: Record<string, number>;
  createdAt: string;
}

// ---- Tic-Tac-Toe ----

export const TIC_TAC_TOE_SIZE = 3;

export type TicTacToeCell = 0 | 1 | 2;
export type TicTacToeBoard = TicTacToeCell[][];

export interface TicTacToeState {
  board: TicTacToeBoard;
  currentPlayer: 1 | 2;
}

// ---- Dots and Boxes ----

export const DOTS_GRID_SIZE = 5; // 5x5 dots → 4x4 boxes

// horizontalLines[row][col]: line from dot(row,col) to dot(row,col+1)
// verticalLines[row][col]: line from dot(row,col) to dot(row+1,col)
export interface DotsState {
  horizontalLines: boolean[][]; // DOTS_GRID_SIZE rows × (DOTS_GRID_SIZE-1) cols
  verticalLines: boolean[][];   // (DOTS_GRID_SIZE-1) rows × DOTS_GRID_SIZE cols
  boxes: (0 | 1 | 2)[][];      // (DOTS_GRID_SIZE-1) × (DOTS_GRID_SIZE-1)
  scores: [number, number];     // [player1, player2]
  currentPlayer: 1 | 2;
}

// ---- Battleship ----

export const BATTLESHIP_GRID_SIZE = 10;
export const BATTLESHIP_TOTAL_SHIP_CELLS = 17; // 5+4+3+3+2

export type BattleshipPhase = 'placing' | 'playing';

// 0 = unknown/empty, 1 = miss, 2 = hit
export type ShotCell = 0 | 1 | 2;

export type BattleshipShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface BattleshipShip {
  id: BattleshipShipId;
  size: number;
  row: number;
  col: number;
  direction: 'h' | 'v';
}

export interface BattleshipState {
  phase: BattleshipPhase;
  shots1: ShotCell[][]; // shots BY player1 at player2's grid (10x10)
  shots2: ShotCell[][]; // shots BY player2 at player1's grid (10x10)
  sunkShips1: BattleshipShip[]; // player1's ships that have been sunk (safe to reveal)
  sunkShips2: BattleshipShip[]; // player2's ships that have been sunk (safe to reveal)
  player1Ready: boolean;
  player2Ready: boolean;
  currentPlayer: 1 | 2;
  hits1: number; // hits by player1 on player2's fleet
  hits2: number; // hits by player2 on player1's fleet
}

// ---- Word Hunt ----

export const WORD_HUNT_GRID_SIZE = 4; // 4x4 = 16 cells
export const WORD_HUNT_DURATION_SECONDS = 80;

export const WORD_HUNT_SCORES: Record<number, number> = {
  3: 100,
  4: 400,
  5: 800,
  6: 1400,
  7: 1800,
};
export const WORD_HUNT_SCORE_MAX = 2200; // 8+ letters

export interface WordHuntFoundWord {
  word: string;
  path: number[]; // flat cell indices 0-15
  score: number;
}

export interface WordHuntPlayerResult {
  words: WordHuntFoundWord[];
  totalScore: number;
  submittedAt: string | null; // null = not yet submitted
}

export interface WordHuntState {
  grid: string[]; // 16 letters, row-major (index = row*4 + col)
  player1: WordHuntPlayerResult;
  player2: WordHuntPlayerResult;
  player1StartedAt: string | null; // set when player 1 clicks "Start my turn"
  player2StartedAt: string | null; // set when player 2 clicks "Start my turn"
  currentPlayer: 1 | 2; // repurposed: tracks submission flow
}

// ---- API Types ----

export interface CreateGameRequest {
  playerName: string;
  gameType?: GameType;
}

export interface JoinGameRequest {
  playerName: string;
}

export interface MakeMoveRequest {
  playerNumber: 1 | 2;
  column?: number;
  row?: number;
  col?: number;
}

export interface ApiError {
  error: string;
}

// ---- Tournament Types ----

export type TournamentFormat = 'single-elimination' | 'double-elimination';

export type TournamentStatus = 'waiting' | 'active' | 'completed';

export type MatchStatus = 'pending' | 'active' | 'completed' | 'bye';

export type BracketSide = 'winners' | 'losers';

export interface Tournament {
  id: string;
  name: string;
  gameType: GameType;
  format: TournamentFormat;
  status: TournamentStatus;
  hostSessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  playerName: string;
  sessionId: string;
  seed: number | null;
  joinedAt: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  gameId: string | null;
  round: number;
  matchIndex: number;
  player1ParticipantId: string | null;
  player2ParticipantId: string | null;
  winnerId: string | null;
  status: MatchStatus;
  bracket: BracketSide;
}

export interface TournamentDetails {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
}

// ---- Tournament API Types ----

export interface CreateTournamentRequest {
  hostName: string;
  tournamentName: string;
  gameType: GameType;
  format: TournamentFormat;
}

export interface JoinTournamentRequest {
  playerName: string;
  sessionId: string;
}

// ---- WebSocket Events ----

export interface ServerToClientEvents {
  gameUpdated: (game: Game) => void;
  playerJoined: (data: { gameId: string; playerName: string }) => void;
  moveMade: (data: { gameId: string; move: Move; game: Game }) => void;
  gameOver: (data: { gameId: string; winner: 1 | 2 | null; isDraw: boolean }) => void;
  error: (data: { message: string }) => void;
  tournamentUpdated: (data: TournamentDetails) => void;
  participantJoined: (data: { tournamentId: string; participant: TournamentParticipant }) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  joinTournament: (tournamentId: string) => void;
  leaveTournament: (tournamentId: string) => void;
}

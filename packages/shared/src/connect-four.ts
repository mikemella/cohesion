import { Board, CellValue, ConnectFourState, CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS } from './types.js';

export function createEmptyBoard(): Board {
  return Array.from({ length: CONNECT_FOUR_ROWS }, () =>
    Array.from({ length: CONNECT_FOUR_COLS }, () => 0 as CellValue)
  );
}

export function createInitialState(): ConnectFourState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1,
  };
}

export function isValidMove(board: Board, column: number): boolean {
  if (column < 0 || column >= CONNECT_FOUR_COLS) return false;
  // Top row of the column must be empty
  return board[0][column] === 0;
}

/** Drop a piece into the given column. Returns the row it landed on, or -1 if invalid. */
export function dropPiece(board: Board, column: number, player: 1 | 2): number {
  for (let row = CONNECT_FOUR_ROWS - 1; row >= 0; row--) {
    if (board[row][column] === 0) {
      board[row][column] = player;
      return row;
    }
  }
  return -1;
}

/** Check if placing at (row, col) created a 4-in-a-row. */
export function checkWin(board: Board, row: number, col: number): boolean {
  const player = board[row][col];
  if (player === 0) return false;

  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Count in positive direction
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= CONNECT_FOUR_ROWS || c < 0 || c >= CONNECT_FOUR_COLS) break;
      if (board[r][c] !== player) break;
      count++;
    }
    // Count in negative direction
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= CONNECT_FOUR_ROWS || c < 0 || c >= CONNECT_FOUR_COLS) break;
      if (board[r][c] !== player) break;
      count++;
    }
    if (count >= 4) return true;
  }

  return false;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every(cell => cell !== 0);
}

/** Apply a move and return the updated state plus result info. */
export function applyMove(
  state: ConnectFourState,
  column: number
): { state: ConnectFourState; row: number; isWin: boolean; isDraw: boolean } {
  const board = state.board.map(row => [...row]) as Board;
  const player = state.currentPlayer;

  const row = dropPiece(board, column, player);
  if (row === -1) {
    throw new Error(`Invalid move: column ${column} is full`);
  }

  const isWin = checkWin(board, row, column);
  const isDraw = !isWin && isBoardFull(board);
  const nextPlayer: 1 | 2 = player === 1 ? 2 : 1;

  return {
    state: {
      board,
      currentPlayer: isWin || isDraw ? player : nextPlayer,
    },
    row,
    isWin,
    isDraw,
  };
}

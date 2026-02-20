import { TicTacToeBoard, TicTacToeState, TIC_TAC_TOE_SIZE } from './types.js';

export function createTTTInitialState(): TicTacToeState {
  return {
    board: Array.from({ length: TIC_TAC_TOE_SIZE }, () =>
      Array.from({ length: TIC_TAC_TOE_SIZE }, () => 0 as const)
    ),
    currentPlayer: 1,
  };
}

export function isTTTValidMove(board: TicTacToeBoard, row: number, col: number): boolean {
  if (row < 0 || row >= TIC_TAC_TOE_SIZE || col < 0 || col >= TIC_TAC_TOE_SIZE) return false;
  return board[row][col] === 0;
}

export function checkTTTWin(board: TicTacToeBoard, row: number, col: number): boolean {
  const player = board[row][col];
  if (player === 0) return false;

  // Check row
  if (board[row].every(cell => cell === player)) return true;

  // Check column
  if (board.every(r => r[col] === player)) return true;

  // Check main diagonal
  if (row === col && board.every((r, i) => r[i] === player)) return true;

  // Check anti-diagonal
  if (row + col === TIC_TAC_TOE_SIZE - 1 && board.every((r, i) => r[TIC_TAC_TOE_SIZE - 1 - i] === player)) return true;

  return false;
}

export function isTTTBoardFull(board: TicTacToeBoard): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

export function applyTTTMove(
  state: TicTacToeState,
  row: number,
  col: number
): { state: TicTacToeState; isWin: boolean; isDraw: boolean } {
  const board = state.board.map(r => [...r]) as TicTacToeBoard;
  const player = state.currentPlayer;

  if (!isTTTValidMove(board, row, col)) {
    throw new Error(`Invalid move: cell (${row}, ${col}) is occupied or out of bounds`);
  }

  board[row][col] = player;

  const isWin = checkTTTWin(board, row, col);
  const isDraw = !isWin && isTTTBoardFull(board);
  const nextPlayer: 1 | 2 = player === 1 ? 2 : 1;

  return {
    state: {
      board,
      currentPlayer: isWin || isDraw ? player : nextPlayer,
    },
    isWin,
    isDraw,
  };
}

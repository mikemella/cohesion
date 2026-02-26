import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  createInitialState,
  isValidMove,
  dropPiece,
  checkWin,
  isBoardFull,
  applyMove,
} from './connect-four.js';
import { CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS } from './types.js';

describe('createInitialState', () => {
  it('returns a 6x7 board of zeros', () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(CONNECT_FOUR_ROWS); // 6
    for (const row of state.board) {
      expect(row).toHaveLength(CONNECT_FOUR_COLS); // 7
      expect(row.every(cell => cell === 0)).toBe(true);
    }
  });

  it('starts with player 1', () => {
    expect(createInitialState().currentPlayer).toBe(1);
  });
});

describe('createEmptyBoard', () => {
  it('returns correct dimensions filled with zeros', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(CONNECT_FOUR_ROWS);
    expect(board[0]).toHaveLength(CONNECT_FOUR_COLS);
    expect(board.flat().every(cell => cell === 0)).toBe(true);
  });
});

describe('isValidMove', () => {
  it('returns true for an empty column', () => {
    const board = createEmptyBoard();
    expect(isValidMove(board, 0)).toBe(true);
    expect(isValidMove(board, 6)).toBe(true);
  });

  it('returns false for out-of-bounds columns', () => {
    const board = createEmptyBoard();
    expect(isValidMove(board, -1)).toBe(false);
    expect(isValidMove(board, 7)).toBe(false);
  });

  it('returns false when the top row of the column is filled', () => {
    const board = createEmptyBoard();
    board[0][3] = 1;
    expect(isValidMove(board, 3)).toBe(false);
  });
});

describe('dropPiece', () => {
  it('lands in the bottom row on an empty board', () => {
    const board = createEmptyBoard();
    const row = dropPiece(board, 0, 1);
    expect(row).toBe(CONNECT_FOUR_ROWS - 1);
    expect(board[CONNECT_FOUR_ROWS - 1][0]).toBe(1);
  });

  it('stacks pieces on top of each other', () => {
    const board = createEmptyBoard();
    dropPiece(board, 3, 1);
    const row2 = dropPiece(board, 3, 2);
    expect(row2).toBe(CONNECT_FOUR_ROWS - 2);
    expect(board[CONNECT_FOUR_ROWS - 2][3]).toBe(2);
  });

  it('returns -1 when the column is full', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) board[r][0] = 1;
    expect(dropPiece(board, 0, 2)).toBe(-1);
  });
});

describe('checkWin', () => {
  it('detects a horizontal 4-in-a-row', () => {
    const board = createEmptyBoard();
    const row = CONNECT_FOUR_ROWS - 1;
    for (let c = 0; c < 4; c++) board[row][c] = 1;
    expect(checkWin(board, row, 0)).toBe(true);
    expect(checkWin(board, row, 3)).toBe(true);
  });

  it('does not trigger on 3-in-a-row', () => {
    const board = createEmptyBoard();
    const row = CONNECT_FOUR_ROWS - 1;
    for (let c = 0; c < 3; c++) board[row][c] = 1;
    expect(checkWin(board, row, 2)).toBe(false);
  });

  it('detects a vertical 4-in-a-row', () => {
    const board = createEmptyBoard();
    const col = 2;
    for (let r = CONNECT_FOUR_ROWS - 4; r < CONNECT_FOUR_ROWS; r++) board[r][col] = 2;
    expect(checkWin(board, CONNECT_FOUR_ROWS - 1, col)).toBe(true);
  });

  it('detects a diagonal (down-right) 4-in-a-row', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 4; i++) board[i][i] = 1;
    expect(checkWin(board, 0, 0)).toBe(true);
  });

  it('detects a diagonal (down-left) 4-in-a-row', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 4; i++) board[i][3 - i] = 2;
    expect(checkWin(board, 0, 3)).toBe(true);
  });

  it('returns false on an empty cell', () => {
    const board = createEmptyBoard();
    expect(checkWin(board, 0, 0)).toBe(false);
  });
});

describe('isBoardFull', () => {
  it('returns false on an empty board', () => {
    expect(isBoardFull(createEmptyBoard())).toBe(false);
  });

  it('returns true when the top row is completely filled', () => {
    const board = createEmptyBoard();
    for (let c = 0; c < CONNECT_FOUR_COLS; c++) board[0][c] = 1;
    expect(isBoardFull(board)).toBe(true);
  });

  it('returns false when only some top cells are filled', () => {
    const board = createEmptyBoard();
    for (let c = 0; c < CONNECT_FOUR_COLS - 1; c++) board[0][c] = 1;
    expect(isBoardFull(board)).toBe(false);
  });
});

describe('applyMove', () => {
  it('switches currentPlayer after a move', () => {
    const state = createInitialState();
    const result = applyMove(state, 0);
    expect(result.state.currentPlayer).toBe(2);
  });

  it('detects a winning move', () => {
    // Set up 3-in-a-row horizontally, then play the 4th
    let state = createInitialState();
    state = applyMove(state, 0).state; // p1
    state = applyMove(state, 0).state; // p2
    state = applyMove(state, 1).state; // p1
    state = applyMove(state, 1).state; // p2
    state = applyMove(state, 2).state; // p1
    state = applyMove(state, 2).state; // p2
    const result = applyMove(state, 3);   // p1 wins horizontally
    expect(result.isWin).toBe(true);
    expect(result.isDraw).toBe(false);
  });

  it('throws when attempting to play in a full column', () => {
    let state = createInitialState();
    // Fill column 0 (alternating players)
    for (let i = 0; i < CONNECT_FOUR_ROWS; i++) {
      state = applyMove(state, 0).state;
    }
    expect(() => applyMove(state, 0)).toThrow();
  });
});

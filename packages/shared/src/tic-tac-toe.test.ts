import { describe, it, expect } from 'vitest';
import {
  createTTTInitialState,
  isTTTValidMove,
  checkTTTWin,
  isTTTBoardFull,
  applyTTTMove,
} from './tic-tac-toe.js';
import { TIC_TAC_TOE_SIZE } from './types.js';

describe('createTTTInitialState', () => {
  it('returns a 3x3 board of zeros', () => {
    const state = createTTTInitialState();
    expect(state.board).toHaveLength(TIC_TAC_TOE_SIZE);
    for (const row of state.board) {
      expect(row).toHaveLength(TIC_TAC_TOE_SIZE);
      expect(row.every(cell => cell === 0)).toBe(true);
    }
  });

  it('starts with player 1', () => {
    expect(createTTTInitialState().currentPlayer).toBe(1);
  });
});

describe('isTTTValidMove', () => {
  it('returns true for an empty cell', () => {
    const { board } = createTTTInitialState();
    expect(isTTTValidMove(board, 0, 0)).toBe(true);
    expect(isTTTValidMove(board, 2, 2)).toBe(true);
  });

  it('returns false for an occupied cell', () => {
    const { board } = createTTTInitialState();
    board[1][1] = 1;
    expect(isTTTValidMove(board, 1, 1)).toBe(false);
  });

  it('returns false for out-of-bounds coordinates', () => {
    const { board } = createTTTInitialState();
    expect(isTTTValidMove(board, -1, 0)).toBe(false);
    expect(isTTTValidMove(board, 0, 3)).toBe(false);
    expect(isTTTValidMove(board, 3, 3)).toBe(false);
  });
});

describe('checkTTTWin', () => {
  it('detects a row win', () => {
    const { board } = createTTTInitialState();
    board[0][0] = board[0][1] = board[0][2] = 1;
    expect(checkTTTWin(board, 0, 1)).toBe(true);
  });

  it('detects a column win', () => {
    const { board } = createTTTInitialState();
    board[0][1] = board[1][1] = board[2][1] = 2;
    expect(checkTTTWin(board, 1, 1)).toBe(true);
  });

  it('detects a main diagonal win', () => {
    const { board } = createTTTInitialState();
    board[0][0] = board[1][1] = board[2][2] = 1;
    expect(checkTTTWin(board, 1, 1)).toBe(true);
  });

  it('detects an anti-diagonal win', () => {
    const { board } = createTTTInitialState();
    board[0][2] = board[1][1] = board[2][0] = 2;
    expect(checkTTTWin(board, 1, 1)).toBe(true);
  });

  it('returns false when the row is not complete', () => {
    const { board } = createTTTInitialState();
    board[0][0] = board[0][1] = 1;
    expect(checkTTTWin(board, 0, 1)).toBe(false);
  });

  it('returns false for an empty cell', () => {
    const { board } = createTTTInitialState();
    expect(checkTTTWin(board, 0, 0)).toBe(false);
  });
});

describe('isTTTBoardFull', () => {
  it('returns false on an empty board', () => {
    expect(isTTTBoardFull(createTTTInitialState().board)).toBe(false);
  });

  it('returns true when all cells are filled', () => {
    const { board } = createTTTInitialState();
    // Fill with no winner: X O X / O X O / O X O
    board[0] = [1, 2, 1];
    board[1] = [2, 1, 2];
    board[2] = [2, 1, 2];
    expect(isTTTBoardFull(board)).toBe(true);
  });

  it('returns false when one cell is still empty', () => {
    const { board } = createTTTInitialState();
    for (let r = 0; r < TIC_TAC_TOE_SIZE; r++) {
      for (let c = 0; c < TIC_TAC_TOE_SIZE; c++) {
        board[r][c] = 1;
      }
    }
    board[2][2] = 0; // leave one empty
    expect(isTTTBoardFull(board)).toBe(false);
  });
});

describe('applyTTTMove', () => {
  it('places the piece and switches player', () => {
    const state = createTTTInitialState();
    const result = applyTTTMove(state, 1, 1);
    expect(result.state.board[1][1]).toBe(1);
    expect(result.state.currentPlayer).toBe(2);
    expect(result.isWin).toBe(false);
    expect(result.isDraw).toBe(false);
  });

  it('detects a winning move', () => {
    let state = createTTTInitialState();
    // p1: (0,0), (0,1) — p2: (1,0), (1,1) — p1: (0,2) wins row 0
    state = applyTTTMove(state, 0, 0).state;
    state = applyTTTMove(state, 1, 0).state;
    state = applyTTTMove(state, 0, 1).state;
    state = applyTTTMove(state, 1, 1).state;
    const result = applyTTTMove(state, 0, 2);
    expect(result.isWin).toBe(true);
    expect(result.isDraw).toBe(false);
  });

  it('detects a draw', () => {
    // X O X / O X O / O X O — draw, no winner
    let state = createTTTInitialState();
    const moves: [number, number][] = [
      [0, 0], [0, 1], [0, 2],
      [1, 1], [1, 0], [1, 2],
      [2, 1], [2, 0], [2, 2],
    ];
    let result = { state, isWin: false, isDraw: false };
    for (const [r, c] of moves) {
      result = applyTTTMove(result.state, r, c);
    }
    expect(result.isDraw).toBe(true);
    expect(result.isWin).toBe(false);
  });

  it('throws when the cell is already occupied', () => {
    const state = createTTTInitialState();
    const next = applyTTTMove(state, 0, 0).state;
    expect(() => applyTTTMove(next, 0, 0)).toThrow();
  });
});

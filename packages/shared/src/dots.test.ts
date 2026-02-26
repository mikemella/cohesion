import { describe, it, expect } from 'vitest';
import { createDotsInitialState, isDotsValidMove, applyDotsMove } from './dots.js';
import { DOTS_GRID_SIZE } from './types.js';

const BOXES = DOTS_GRID_SIZE - 1; // 4x4 boxes on a 5x5 dot grid

describe('createDotsInitialState', () => {
  it('creates the correct grid dimensions', () => {
    const state = createDotsInitialState();
    expect(state.horizontalLines).toHaveLength(DOTS_GRID_SIZE);
    expect(state.horizontalLines[0]).toHaveLength(BOXES);
    expect(state.verticalLines).toHaveLength(BOXES);
    expect(state.verticalLines[0]).toHaveLength(DOTS_GRID_SIZE);
    expect(state.boxes).toHaveLength(BOXES);
    expect(state.boxes[0]).toHaveLength(BOXES);
  });

  it('starts with all lines undrawn', () => {
    const state = createDotsInitialState();
    expect(state.horizontalLines.flat().every(v => v === false)).toBe(true);
    expect(state.verticalLines.flat().every(v => v === false)).toBe(true);
  });

  it('starts with scores [0, 0] and player 1', () => {
    const state = createDotsInitialState();
    expect(state.scores).toEqual([0, 0]);
    expect(state.currentPlayer).toBe(1);
  });
});

describe('isDotsValidMove', () => {
  it('returns true for an undrawn horizontal line', () => {
    const state = createDotsInitialState();
    expect(isDotsValidMove(state, 0, 0, 0)).toBe(true);
  });

  it('returns true for an undrawn vertical line', () => {
    const state = createDotsInitialState();
    expect(isDotsValidMove(state, 1, 0, 0)).toBe(true);
  });

  it('returns false for an already-drawn horizontal line', () => {
    const state = createDotsInitialState();
    const next = applyDotsMove(state, 0, 0, 0).state;
    expect(isDotsValidMove(next, 0, 0, 0)).toBe(false);
  });

  it('returns false for out-of-bounds horizontal move', () => {
    const state = createDotsInitialState();
    expect(isDotsValidMove(state, 0, -1, 0)).toBe(false);
    expect(isDotsValidMove(state, 0, 0, BOXES)).toBe(false);
  });

  it('returns false for out-of-bounds vertical move', () => {
    const state = createDotsInitialState();
    expect(isDotsValidMove(state, 1, BOXES, 0)).toBe(false);
    expect(isDotsValidMove(state, 1, 0, DOTS_GRID_SIZE)).toBe(false);
  });
});

describe('applyDotsMove', () => {
  it('switches player when no box is claimed', () => {
    const state = createDotsInitialState();
    const result = applyDotsMove(state, 0, 0, 0);
    expect(result.state.currentPlayer).toBe(2);
    expect(result.isWin).toBe(false);
    expect(result.isDraw).toBe(false);
  });

  it('keeps the same player when a box is claimed', () => {
    // Complete the top-left box: top (h[0][0]), bottom (h[1][0]), left (v[0][0]), right (v[0][1])
    let state = createDotsInitialState();
    state = applyDotsMove(state, 0, 0, 0).state; // p1: top    → switches to p2
    state = applyDotsMove(state, 0, 1, 0).state; // p2: bottom → switches to p1
    state = applyDotsMove(state, 1, 0, 0).state; // p1: left   → switches to p2
    // p2 draws the right side, completing the box → should stay p2
    const result = applyDotsMove(state, 1, 0, 1);
    expect(result.state.scores[1]).toBe(1); // player 2 scored
    expect(result.state.currentPlayer).toBe(2); // p2 goes again
  });

  it('increments the correct player score', () => {
    let state = createDotsInitialState();
    state = applyDotsMove(state, 0, 0, 0).state; // p1 top
    state = applyDotsMove(state, 0, 1, 0).state; // p2 bottom
    state = applyDotsMove(state, 1, 0, 0).state; // p1 left
    const result = applyDotsMove(state, 1, 0, 1); // p2 right → claims box
    expect(result.state.scores[1]).toBe(1);
    expect(result.state.scores[0]).toBe(0);
  });

  it('throws when placing on an already-drawn line', () => {
    const state = createDotsInitialState();
    const next = applyDotsMove(state, 0, 0, 0).state;
    expect(() => applyDotsMove(next, 0, 0, 0)).toThrow();
  });
});
